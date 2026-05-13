import { RoomStatus, StreamStatus } from "@prisma/client"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { rateLimitGuard, getClientIp } from "@/lib/rate-limit"
import { stopStream } from "@/lib/egress"
import { listParticipants, removeParticipant } from "@/lib/livekit"
import { prisma } from "@/lib/prisma"
import { getCachedRoom, invalidateRoomCache } from "@/lib/room-cache"
import { getPostHogClient } from "@/lib/posthog-server"
import { publishEvent } from "@/lib/redis"
import { stopConnectors } from "@/lib/chat/manager"

/**
 * F-25: pause the studio without permanently ending it.
 *
 * Pause = stop egress + stop chat connectors + kick guests, but leave the
 * Room row in LOBBY so the host can return via the same code later. Distinct
 * from /end which transitions Room.status → ENDED and clears Redis keys.
 *
 * Why is this safe?
 * - Host owns the room; only host can pause/end. Pause does not touch Room
 *   status beyond what was already true (it stays LOBBY, never moves to LIVE
 *   on its own — that's egress, not room state).
 * - StreamSession is marked ENDED. Next stream-live POST creates a fresh
 *   StreamSession when the host resumes.
 * - Redis room keys are NOT deleted — chat history, state, and presence
 *   survive the pause so a resuming host sees continuity.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await params

  const blocked = await rateLimitGuard(getClientIp(req), "rooms:pause")
  if (blocked) return blocked

  const room = await getCachedRoom(code)
  if (!room || room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Cannot pause a room that has already been permanently ended.
  if (room.status === RoomStatus.ENDED) {
    return NextResponse.json({ error: "Room has already ended" }, { status: 410 })
  }

  // Stop any active egress (always — pause implies stream off)
  const activeEgress = await prisma.streamSession.findFirst({
    where: { roomId: room.id, status: { in: [StreamStatus.STARTING, StreamStatus.LIVE] } },
  })
  if (activeEgress?.egressId) {
    await Promise.allSettled([
      stopStream(activeEgress.egressId),
      prisma.streamSession.update({
        where: { id: activeEgress.id },
        data: { status: StreamStatus.ENDED, endedAt: new Date() },
      }),
    ])
  }

  // Kick all non-host participants (pause clears the guest list)
  const hostIdentity = `host-${session.user.id}`
  const participants = await listParticipants(code).catch(
    () => [] as Awaited<ReturnType<typeof listParticipants>>
  )
  const kickOps = participants
    .filter((p) => p.identity !== hostIdentity)
    .map((p) => removeParticipant(code, p.identity).catch(() => undefined))
  await Promise.allSettled(kickOps)

  // Notify all participants — clients should redirect to recap or "paused" copy.
  await publishEvent(code, { type: "STUDIO_PAUSED" })

  // Stop chat connectors so we don't bill external APIs while paused
  await stopConnectors(code)

  // Invalidate room cache so any later resume re-reads fresh row
  await invalidateRoomCache(code)

  const posthog = getPostHogClient()
  posthog.capture({
    distinctId: session.user.id,
    event: "session_paused",
    properties: { room_code: code },
  })

  return NextResponse.json({ ok: true })
}
