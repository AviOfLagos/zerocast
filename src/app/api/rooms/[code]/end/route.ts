import { RoomStatus, StreamStatus } from "@prisma/client"
import { NextResponse } from "next/server"

import { authenticateHost } from "@/lib/host-auth"
import { rateLimitGuard, getClientIp } from "@/lib/rate-limit"
import { stopStream } from "@/lib/egress"
import { closeLivekitRoom, getParticipantCount, listParticipants, removeParticipant } from "@/lib/livekit"
import { prisma } from "@/lib/prisma"
import { invalidateRoomCache } from "@/lib/room-cache"
import { getPostHogClient } from "@/lib/posthog-server"
import { deleteRoomKeys, publishEvent, redis } from "@/lib/redis"
import { stopConnectors } from "@/lib/chat/manager"

const SUMMARY_TTL = 60 * 60 * 24 // 24 hours

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const blocked = await rateLimitGuard(getClientIp(req), "rooms:end")
  if (blocked) return blocked

  // ── Auth: session OR LiveKit host JWT (for demo/direct access) ──────────
  const authResult = await authenticateHost(req, code)
  if (!authResult.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { room, userId } = authResult

  // Parse optional body — default both to true for backward compatibility
  let stopStreams = true
  let kickParticipants = true
  try {
    const body = await req.json()
    if (typeof body?.stopStreams === "boolean") stopStreams = body.stopStreams
    if (typeof body?.kickParticipants === "boolean") kickParticipants = body.kickParticipants
  } catch {
    // No body or invalid JSON — use defaults
  }

  // G09: idempotent — if already ended, return success immediately
  if (room.status === RoomStatus.ENDED) {
    return NextResponse.json({ ok: true })
  }

  const endedAt = new Date()
  const endedAtMs = endedAt.getTime()

  // G09: use updateMany with a status guard to win the race atomically
  // Match both LOBBY and LIVE since either can transition to ENDED
  const updated = await prisma.room.updateMany({
    where: { code, status: { not: RoomStatus.ENDED } },
    data: { status: RoomStatus.ENDED, endedAt },
  })
  if (updated.count === 0) {
    // Another request already ended the room
    return NextResponse.json({ ok: true })
  }

  // Invalidate room cache after status change
  await invalidateRoomCache(code)

  // Bulk-update all participants with leftAt = now() where leftAt IS NULL
  await prisma.participant.updateMany({
    where: { roomId: room.id, leftAt: null },
    data: { leftAt: endedAt },
  })

  // G10: use Promise.allSettled so a failure in one stat doesn't crash the whole response
  const [participantResult, messageResult, startTsResult] = await Promise.allSettled([
    getParticipantCount(code),
    redis.llen(`room:${code}:chat`),
    redis.get(`session:start:${code}`),
  ])

  const participantCount = participantResult.status === "fulfilled" ? participantResult.value : 0
  const messageCount = messageResult.status === "fulfilled" ? messageResult.value : 0
  // G08: fall back to room.createdAt (not endedAtMs) when session:start is missing
  const startTsRaw = startTsResult.status === "fulfilled" ? startTsResult.value : null
  const startTs = startTsRaw ? Number(startTsRaw) : room.createdAt.getTime()
  const durationSeconds = Math.floor((endedAtMs - startTs) / 1000)

  // Derive connected platforms from messages in chat list
  const chatRaw = await redis.lrange(`room:${code}:chat`, 0, -1)
  const platformSet = new Set<string>()
  for (const item of chatRaw) {
    const parsed = typeof item === "string" ? JSON.parse(item) : item
    if (parsed?.platform) platformSet.add(parsed.platform)
  }
  const platforms = Array.from(platformSet)

  // Save summary (24h TTL)
  const summary = {
    code,
    endedAt: endedAt.toISOString(),
    durationSeconds,
    participantCount,
    peakParticipants: participantCount,
    messageCount,
    platforms,
  }
  await redis.set(`session:summary:${code}`, JSON.stringify(summary), { ex: SUMMARY_TTL })

  // Stop any active egress (conditionally)
  const activeEgress = await prisma.streamSession.findFirst({
    where: { roomId: room.id, status: { in: [StreamStatus.STARTING, StreamStatus.LIVE] } },
  })
  if (activeEgress?.egressId && stopStreams) {
    await Promise.allSettled([
      stopStream(activeEgress.egressId),
      prisma.streamSession.update({
        where: { id: activeEgress.id },
        data: { status: StreamStatus.ENDED, endedAt: endedAt },
      }),
    ])
  } else if (activeEgress?.egressId && !stopStreams) {
    // Still mark DB record as ended even if stream was not explicitly stopped
    // (the room closure below will tear down egress anyway)
    await prisma.streamSession.update({
      where: { id: activeEgress.id },
      data: { status: StreamStatus.ENDED, endedAt: endedAt },
    }).catch(() => undefined)
  }

  // Kick all non-host participants if requested
  if (kickParticipants) {
    const hostIdentity = `host-${userId}`
    const participants = await listParticipants(code).catch(() => [] as Awaited<ReturnType<typeof listParticipants>>)
    const kickOps = participants
      .filter((p) => p.identity !== hostIdentity)
      .map((p) => removeParticipant(code, p.identity).catch(() => undefined))
    await Promise.allSettled(kickOps)
  }

  // Notify all participants before cleanup
  await publishEvent(code, { type: "STUDIO_ENDED" })

  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: userId,
    event: "session_ended",
    properties: {
      room_code: code,
      duration_seconds: durationSeconds,
      participant_count: participantCount,
      message_count: messageCount,
      platform_count: platforms.length,
      platforms,
    },
  })

  // Stop chat connectors before closing the LiveKit room
  await stopConnectors(code)

  // Clean up LiveKit room (DB already updated above)
  await Promise.allSettled([closeLivekitRoom(code)])

  // Give SSE clients a moment to receive STUDIO_ENDED, then delete keys
  // within the request lifecycle (setTimeout never fires on Vercel serverless)
  await new Promise<void>((r) => setTimeout(r, 1000))
  await deleteRoomKeys(code)

  return NextResponse.json({ ok: true })
}
