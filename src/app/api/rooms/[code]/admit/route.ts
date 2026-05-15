import { ParticipantRole, RoomStatus } from "@prisma/client"
import { NextResponse } from "next/server"

import { authenticateHost } from "@/lib/host-auth"
import { generateParticipantToken, getParticipantCount } from "@/lib/livekit"
import { prisma } from "@/lib/prisma"
import { deletePendingGuest, publishEvent, redis, setApprovedGuest } from "@/lib/redis"
import { rateLimitGuard, getClientIp } from "@/lib/rate-limit"
import { AdmitGuestRequestSchema } from "@/lib/schemas"
import { validateRequestBody } from "@/lib/schemas/api"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const blocked = await rateLimitGuard(getClientIp(req), "rooms:admit")
  if (blocked) return blocked

  const body = await req.json().catch(() => ({}))
  const validation = validateRequestBody(AdmitGuestRequestSchema, body)
  if (!validation.success) return validation.response

  const { guestId, name } = validation.data

  // ── Auth: session OR LiveKit host JWT (for demo/direct access) ──────────
  const authResult = await authenticateHost(req, code)
  if (!authResult.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { room } = authResult

  // G05: reject admit on an ended room
  if (room.status === RoomStatus.ENDED) {
    return NextResponse.json({ error: "Room has ended" }, { status: 410 })
  }

  // ── Enforce 6-person limit ───────────────────────────────────────────────
  const count = await getParticipantCount(code)
  if (count >= 6) {
    return NextResponse.json({ error: "Room is full (max 6 participants)" }, { status: 400 })
  }

  const displayName = name ?? "Guest"
  const identity = `guest-${guestId}`
  const guestToken = await generateParticipantToken(code, guestId, displayName)
  await setApprovedGuest(code, guestId, guestToken)
  await deletePendingGuest(code, guestId)

  // Clean up pending-names so the name slot is freed
  await redis.srem(`room:${code}:pending-names`, displayName.trim())

  await publishEvent(code, { type: "GUEST_ADMITTED", data: { guestId, token: guestToken, identity, name: displayName } })

  // Create Participant record in DB
  await prisma.participant.create({
    data: {
      roomId: room.id,
      name: displayName,
      identity,
      role: ParticipantRole.GUEST,
    },
  })

  return NextResponse.json({ ok: true, identity })
}
