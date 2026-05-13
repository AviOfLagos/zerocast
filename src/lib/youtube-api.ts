/**
 * YouTube Data API v3 helpers for broadcast metadata management.
 *
 * All functions are best-effort: they return `false` on failure and never throw,
 * so a YouTube API error never blocks the RTMP stream from starting.
 *
 * Requires: OAuth access token with `youtube` or `youtube.force-ssl` scope.
 * Without an access token (stream-key-only connections) all calls are no-ops.
 */

const YT_API = "https://www.googleapis.com/youtube/v3"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveBroadcast {
  id: string
  snippet: {
    title: string
    description: string
    liveChatId?: string
  }
  contentDetails?: {
    boundStreamId?: string
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Find the active (or upcoming) broadcast that the caller owns.
 * Returns the first `active` broadcast; falls back to `upcoming` if none is active yet.
 */
async function findCurrentBroadcast(accessToken: string): Promise<LiveBroadcast | null> {
  try {
    // Try active first (stream already live)
    for (const status of ["active", "upcoming"] as const) {
      const url = new URL(`${YT_API}/liveBroadcasts`)
      url.searchParams.set("part", "snippet,contentDetails")
      url.searchParams.set("broadcastStatus", status)
      url.searchParams.set("broadcastType", "all")
      url.searchParams.set("maxResults", "5")

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const body = await res.text()
        console.warn(`[youtube-api] liveBroadcasts.list (${status}) failed: ${res.status} ${body}`)
        continue
      }

      const data = await res.json() as { items?: LiveBroadcast[] }
      if (data.items && data.items.length > 0) {
        return data.items[0]
      }
    }

    return null
  } catch (err) {
    console.warn("[youtube-api] findCurrentBroadcast error:", err)
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Update the title and/or description of the caller's current YouTube broadcast.
 *
 * No-op (returns false) if no access token is provided.
 * Returns true on success, false on any failure.
 */
export async function updateBroadcastMetadata(
  accessToken: string | null | undefined,
  title: string,
  description: string,
): Promise<boolean> {
  if (!accessToken) return false

  const broadcast = await findCurrentBroadcast(accessToken)
  if (!broadcast) {
    console.warn("[youtube-api] updateBroadcastMetadata: no active/upcoming broadcast found")
    return false
  }

  try {
    const res = await fetch(`${YT_API}/liveBroadcasts?part=snippet`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: broadcast.id,
        snippet: {
          title: title.slice(0, 100),          // YouTube title max = 100 chars
          description: description.slice(0, 5000), // YouTube description max = 5000 chars
          scheduledStartTime: new Date().toISOString(), // required field for update
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.warn(`[youtube-api] liveBroadcasts.update failed: ${res.status} ${body}`)
      return false
    }

    console.info(`[youtube-api] Broadcast "${broadcast.id}" updated — title: "${title}"`)
    return true
  } catch (err) {
    console.warn("[youtube-api] updateBroadcastMetadata update error:", err)
    return false
  }
}

/**
 * F-23: resolve the public watch URL for the caller's current live broadcast.
 *
 * Falls back to `null` if no access token, no active/upcoming broadcast, or
 * the API call fails. Caller decides how to degrade (e.g. channel-page URL).
 */
export async function getBroadcastWatchUrl(
  accessToken: string | null | undefined,
): Promise<string | null> {
  if (!accessToken) return null
  const broadcast = await findCurrentBroadcast(accessToken)
  if (!broadcast) return null
  return `https://youtube.com/watch?v=${broadcast.id}`
}

/**
 * Upload a custom thumbnail to the caller's current YouTube broadcast.
 *
 * No-op (returns false) if no access token or thumbnail URL is provided.
 * Downloads the image from `thumbnailUrl` then POSTs to thumbnails.set.
 * Returns true on success, false on any failure.
 */
export async function uploadThumbnail(
  accessToken: string | null | undefined,
  thumbnailUrl: string | null | undefined,
): Promise<boolean> {
  if (!accessToken || !thumbnailUrl) return false

  const broadcast = await findCurrentBroadcast(accessToken)
  if (!broadcast) {
    console.warn("[youtube-api] uploadThumbnail: no active/upcoming broadcast found")
    return false
  }

  try {
    // Download the image
    const imgRes = await fetch(thumbnailUrl)
    if (!imgRes.ok) {
      console.warn(`[youtube-api] Failed to download thumbnail from ${thumbnailUrl}: ${imgRes.status}`)
      return false
    }

    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg"
    const imageBuffer = await imgRes.arrayBuffer()

    // Validate: YouTube accepts JPEG/PNG, max 2 MB
    const MAX_BYTES = 2 * 1024 * 1024
    if (imageBuffer.byteLength > MAX_BYTES) {
      console.warn(`[youtube-api] Thumbnail too large: ${imageBuffer.byteLength} bytes (max 2 MB)`)
      return false
    }

    // Upload to YouTube thumbnails API
    const uploadUrl = new URL("https://www.googleapis.com/upload/youtube/v3/thumbnails/set")
    uploadUrl.searchParams.set("videoId", broadcast.id)
    uploadUrl.searchParams.set("uploadType", "media")

    const uploadRes = await fetch(uploadUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
        "Content-Length": String(imageBuffer.byteLength),
      },
      body: imageBuffer,
    })

    if (!uploadRes.ok) {
      const body = await uploadRes.text()
      console.warn(`[youtube-api] thumbnails.set failed: ${uploadRes.status} ${body}`)
      return false
    }

    console.info(`[youtube-api] Thumbnail uploaded for broadcast "${broadcast.id}"`)
    return true
  } catch (err) {
    console.warn("[youtube-api] uploadThumbnail error:", err)
    return false
  }
}

/**
 * Returns true if the given PlatformConnection accessToken appears valid
 * (non-null and not expired). Does not make a network call.
 */
export function hasValidAccessToken(
  accessToken: string | null | undefined,
  expiresAt: Date | null | undefined,
): boolean {
  if (!accessToken) return false
  if (expiresAt && expiresAt < new Date()) return false
  return true
}
