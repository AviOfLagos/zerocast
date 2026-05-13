/**
 * F-23: best-effort resolution of public viewer URLs per streaming platform.
 *
 * Priority order:
 *   1. Platform with OAuth-aware live URL (YouTube only today) — exact broadcast.
 *   2. Channel-name fallback (Twitch / Kick / TikTok) — always-live profile link.
 *   3. null — caller falls back to disabled state.
 *
 * Never throws; failures degrade gracefully so a missing watch link cannot
 * block a stream from going live or kill the platforms endpoint.
 */

import { prisma } from "@/lib/prisma"
import { getBroadcastWatchUrl } from "@/lib/youtube-api"

function sanitizeSlug(channelName: string): string {
  return channelName.replace(/^@/, "").trim()
}

/** Derive a non-OAuth fallback URL from the connected channel name. */
function fallbackUrl(platform: string, channelName: string | null | undefined): string | null {
  if (!channelName) return null
  const slug = sanitizeSlug(channelName)
  if (!slug) return null
  switch (platform.toLowerCase()) {
    case "youtube":
      return `https://youtube.com/@${slug}/live`
    case "twitch":
      return `https://twitch.tv/${slug}`
    case "kick":
      return `https://kick.com/${slug}`
    case "tiktok":
      return `https://tiktok.com/@${slug}/live`
    default:
      return null
  }
}

/**
 * Resolve public viewer URLs for the given platforms owned by `userId`.
 *
 * `platforms` should match values stored on PlatformConnection.platform
 * (case-insensitive). Returns a flat map keyed by lower-cased platform.
 */
export async function resolvePublicUrls(
  userId: string,
  platforms: string[],
): Promise<Record<string, string>> {
  if (platforms.length === 0) return {}

  // Fetch all connections in one query
  const upper = platforms.map((p) => p.toUpperCase())
  const conns = await prisma.platformConnection.findMany({
    where: {
      userId,
      platform: { in: upper as unknown as Array<"YOUTUBE" | "TWITCH" | "KICK" | "TIKTOK"> },
    },
    select: { platform: true, channelName: true, accessToken: true },
  })

  const out: Record<string, string> = {}

  await Promise.all(
    conns.map(async (conn) => {
      const key = conn.platform.toLowerCase()
      // YouTube: try OAuth lookup first (exact broadcast URL), fall back to channel /live.
      if (key === "youtube") {
        const watchUrl = await getBroadcastWatchUrl(conn.accessToken).catch(() => null)
        if (watchUrl) {
          out[key] = watchUrl
          return
        }
      }
      const fb = fallbackUrl(key, conn.channelName)
      if (fb) out[key] = fb
    })
  )

  return out
}
