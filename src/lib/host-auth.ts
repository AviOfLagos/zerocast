import type { Room } from "@prisma/client"
import { jwtVerify } from "jose"

import { auth } from "@/auth"
import { getCachedRoom } from "@/lib/room-cache"

export type HostAuthResult =
  | { authorized: true; room: Room; userId: string }
  | { authorized: false; room: Room | null; userId: null }

/**
 * Authenticate a host caller for a room.
 *
 * Accepts EITHER:
 *  - a NextAuth session whose user.id equals room.hostId
 *  - an `Authorization: Bearer <livekit-jwt>` whose `video.roomAdmin` is true
 *    AND whose `sub` matches room.hostId (i.e. a host token minted for this user)
 *
 * jwtVerify validates the signature AND the `exp` claim, so expired tokens are rejected.
 * Returns the resolved room and effective host userId on success.
 */
export async function authenticateHost(
  req: Request,
  code: string,
): Promise<HostAuthResult> {
  const room = await getCachedRoom(code)

  // 1. Bearer token (preferred — covers demo / direct-access paths)
  const authHeader = req.headers.get("authorization") ?? ""
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    try {
      const apiSecret = process.env.LIVEKIT_API_SECRET
      if (!apiSecret) throw new Error("Missing LIVEKIT_API_SECRET")
      const secret = new TextEncoder().encode(apiSecret)
      const { payload } = await jwtVerify(token, secret)
      const video = payload.video as Record<string, unknown> | undefined
      if (video?.roomAdmin && typeof payload.sub === "string") {
        if (room && room.hostId === payload.sub) {
          return { authorized: true, room, userId: room.hostId }
        }
      }
    } catch {
      // invalid/expired token — fall through to session
    }
  }

  // 2. NextAuth session
  const session = await auth()
  if (session?.user?.id && room && room.hostId === session.user.id) {
    return { authorized: true, room, userId: room.hostId }
  }

  return { authorized: false, room, userId: null }
}
