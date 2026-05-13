import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { getCachedRoom } from "@/lib/room-cache"
import { getRoomPublicUrls } from "@/lib/redis"

/**
 * F-23: returns the cached public viewer URLs for each platform the host is
 * currently streaming to. Host-only; written by /api/rooms/[code]/stream-live
 * on stream start and on destination change.
 *
 * Shape: { urls: { youtube: "https://...", twitch: "https://...", ... } }
 * Empty object when nothing is cached (stream not started, or resolver gave up).
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ urls: {} })
  const { code } = await params
  const room = await getCachedRoom(code)
  if (!room || room.hostId !== session.user.id) {
    return NextResponse.json({ urls: {} })
  }
  const urls = await getRoomPublicUrls(code).catch(() => ({}))
  return NextResponse.json({ urls })
}
