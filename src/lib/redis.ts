import { Redis } from "@upstash/redis"
import type { ChatMessage } from "./chat/types"
import { stripHtml } from "./sanitize"

// Lazy singleton so the Redis client is only instantiated when first used,
// not at module-load time (which would fail during build if env vars are placeholders).
let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim()
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim()
    _redis = new Redis({ url, token })
  }
  return _redis
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

const TTL = 60 * 60 * 24 // 24 hours

// ── Internal helper: register a key in the room's key-tracking Set ──────────
async function trackRoomKey(code: string, key: string): Promise<void> {
  const trackingKey = `room:${code}:_keys`
  await redis.sadd(trackingKey, key)
  await redis.expire(trackingKey, TTL)
}

// Room info
export async function setRoomInfo(code: string, data: object) {
  const key = `room:${code}:info`
  await redis.set(key, JSON.stringify(data), { ex: TTL })
  await trackRoomKey(code, key)
}

export async function getRoomInfo(code: string) {
  const val = await redis.get(`room:${code}:info`)
  return val ? (typeof val === "string" ? JSON.parse(val) : val) : null
}

// Pending guests
export async function setPendingGuest(code: string, guestId: string, data: object) {
  const key = `room:${code}:pending:${guestId}`
  await redis.set(key, JSON.stringify(data), { ex: TTL })
  await trackRoomKey(code, key)
}

export async function deletePendingGuest(code: string, guestId: string) {
  await redis.del(`room:${code}:pending:${guestId}`)
}

// Approved guests
export async function setApprovedGuest(code: string, guestId: string, token: string) {
  const key = `room:${code}:approved:${guestId}`
  await redis.set(key, token, { ex: TTL })
  await trackRoomKey(code, key)
}

// F-23: public watch URLs per platform. Hash payload like
// { youtube: "https://youtube.com/watch?v=...", twitch: "https://twitch.tv/x" }.
export async function setRoomPublicUrls(code: string, urls: Record<string, string>) {
  if (Object.keys(urls).length === 0) return
  const key = `room:${code}:public_urls`
  await redis.set(key, JSON.stringify(urls), { ex: TTL })
  await trackRoomKey(code, key)
}

export async function getRoomPublicUrls(code: string): Promise<Record<string, string>> {
  const val = await redis.get(`room:${code}:public_urls`)
  if (!val) return {}
  try {
    return typeof val === "string" ? JSON.parse(val) : (val as Record<string, string>)
  } catch {
    return {}
  }
}

// F-21: per-platform concurrent viewer counts. Hash payload like
// { youtube: 1234, twitch: 87, kick: null }. Short TTL (5min) so a stale
// value times out instead of misleading the host.
const VIEWER_COUNTS_TTL = 60 * 5
export async function setRoomViewerCounts(code: string, counts: Record<string, number | null>) {
  const key = `room:${code}:viewer_counts`
  await redis.set(key, JSON.stringify(counts), { ex: VIEWER_COUNTS_TTL })
  await trackRoomKey(code, key)
}

export async function getRoomViewerCounts(code: string): Promise<Record<string, number | null>> {
  const val = await redis.get(`room:${code}:viewer_counts`)
  if (!val) return {}
  try {
    return typeof val === "string" ? JSON.parse(val) : (val as Record<string, number | null>)
  } catch {
    return {}
  }
}

// Cleanup room
export async function deleteRoomKeys(code: string) {
  const trackingKey = `room:${code}:_keys`
  const keys = await redis.smembers(trackingKey)
  // Always include dynamically-created keys that may not be individually tracked
  const extraKeys = [
    `room:${code}:events`,
    `room:${code}:chat`,
    `room:${code}:chat:seen`,
    `room:${code}:hostState`,
    trackingKey,
  ]
  const allKeys = Array.from(new Set([...keys, ...extraKeys]))
  if (allKeys.length > 0) await redis.del(...allKeys)
}

// Publish events
export interface RoomEvent {
  type: "GUEST_REQUEST" | "GUEST_ADMITTED" | "GUEST_DENIED" | "STUDIO_ENDED" | "STUDIO_PAUSED" | "GUEST_LEFT" | "PLATFORM_TOKEN_EXPIRED" | "STREAM_STARTED" | "STREAM_STOPPED" | "STREAM_DESTINATION_CHANGED" | "STREAM_ERROR" | "PLATFORM_STREAM_DROPPED"
  data?: Record<string, unknown>
}

/**
 * Publish a studio event (guest requests, studio ended, etc.) to the Redis list for a room.
 */
export async function publishEvent(roomCode: string, event: RoomEvent): Promise<void>
export async function publishEvent(roomCode: string, event: Record<string, unknown>): Promise<void>
export async function publishEvent(roomCode: string, event: RoomEvent | Record<string, unknown>): Promise<void> {
  const payload = { ...event, _ts: Date.now() }
  const key = `room:${roomCode}:events`
  await redis.lpush(key, JSON.stringify(payload))
  await redis.ltrim(key, 0, 199)
  await redis.expire(key, TTL)
  await trackRoomKey(roomCode, key)
}

const DEDUP_TTL = 60 * 60 // 1 hour TTL for dedup keys

/**
 * Publish a chat message to the Redis list for a room.
 * Deduplicates by msg.id + msg.platform using a Redis SET with TTL.
 * The SSE endpoint polls this list every second.
 */
export async function publishChat(roomCode: string, msg: ChatMessage | object): Promise<void> {
  // Sanitize incoming chat message text — strip HTML, preserve emoji/unicode, limit to 2000 chars
  const msgRecord = msg as Record<string, unknown>
  if (typeof msgRecord.message === "string") {
    msgRecord.message = stripHtml(msgRecord.message).trim().slice(0, 2000)
  }
  // Sanitize author name if present
  if (
    msgRecord.author &&
    typeof msgRecord.author === "object" &&
    typeof (msgRecord.author as Record<string, unknown>).name === "string"
  ) {
    ;(msgRecord.author as Record<string, unknown>).name = stripHtml(
      (msgRecord.author as Record<string, unknown>).name as string,
    ).trim().slice(0, 50)
  }

  // Build dedup key from message id + platform
  const dedupId = `${msgRecord.id ?? ""}:${msgRecord.platform ?? ""}`
  const dedupKey = `room:${roomCode}:chat:seen`

  // Check if already seen — SISMEMBER returns 1 if exists
  const alreadySeen = await redis.sismember(dedupKey, dedupId)
  if (alreadySeen) return

  // Mark as seen
  await redis.sadd(dedupKey, dedupId)
  await redis.expire(dedupKey, DEDUP_TTL)
  await trackRoomKey(roomCode, dedupKey)

  const payload = { ...msg, _ts: Date.now() }
  const chatKey = `room:${roomCode}:chat`
  // LPUSH so newest items are at head; keep last 500 messages
  await redis.lpush(chatKey, JSON.stringify(payload))
  await redis.ltrim(chatKey, 0, 499)
  await redis.expire(chatKey, TTL)
  await trackRoomKey(roomCode, chatKey)
}

// Poll for new events since a given timestamp
export async function pollEvents(code: string, since: number): Promise<RoomEvent[]> {
  const raw = await redis.lrange(`room:${code}:events`, 0, -1)
  return raw
    .map((item) => (typeof item === "string" ? JSON.parse(item) : item))
    .filter((e) => e._ts > since)
    .reverse()
}

/**
 * Cursor-based event polling for RoomEventRelay.
 * Only fetches items newer than `fromTs` so we never re-scan old entries.
 * Returns events sorted oldest-first (ascending _ts), ready to relay in order.
 */
export async function pollEventsSince(
  code: string,
  fromTs: number
): Promise<Array<RoomEvent & { _ts: number }>> {
  // LRANGE 0 -1 is unavoidable with a Redis list, but only ONE client (the host)
  // ever calls this — guests receive events via LiveKit data channels instead.
  const raw = await redis.lrange(`room:${code}:events`, 0, -1)
  return (raw
    .map((item) => (typeof item === "string" ? JSON.parse(item) : item))
    .filter((e: { _ts: number }) => e._ts > fromTs)
    .reverse() as Array<RoomEvent & { _ts: number }>)
}

/**
 * Cursor-based chat polling for RoomEventRelay.
 * Returns messages newer than `fromTs` sorted oldest-first.
 */
export async function pollChatSince(
  code: string,
  fromTs: number,
  lastId?: string
): Promise<Array<{ _ts: number; id?: string; [key: string]: unknown }>> {
  const raw = await redis.lrange(`room:${code}:chat`, 0, -1)
  const all = raw
    .map((item) => (typeof item === "string" ? JSON.parse(item) : item))
    .reverse() // oldest first

  if (lastId) {
    const idx = all.findIndex((m: { id?: string }) => m.id === lastId)
    if (idx >= 0) return all.slice(idx + 1)
  }
  return all.filter((e: { _ts: number }) => e._ts > fromTs)
}

// Studio host state persistence (F-11)
export async function saveStudioState(code: string, state: object): Promise<void> {
  try {
    const key = `room:${code}:hostState`
    await redis.set(key, JSON.stringify(state), { ex: TTL })
    await trackRoomKey(code, key)
  } catch (err) {
    console.warn("[saveStudioState] Redis write failed, state not persisted:", err)
  }
}

export async function loadStudioState(code: string): Promise<object | null> {
  try {
    const val = await redis.get(`room:${code}:hostState`)
    if (!val) return null
    return typeof val === "string" ? JSON.parse(val) : (val as object)
  } catch (err) {
    console.warn("[loadStudioState] Redis read failed, using defaults:", err)
    return null
  }
}

/**
 * Poll chat messages from Redis.
 * Supports both cursor-based (lastMessageId) and timestamp-based (since) filtering.
 * Cursor-based is preferred: returns only messages newer than the cursor.
 */
export async function pollChat(
  code: string,
  since: number,
  lastMessageId?: string
): Promise<object[]> {
  const raw = await redis.lrange(`room:${code}:chat`, 0, -1)
  const all = raw
    .map((item) => (typeof item === "string" ? JSON.parse(item) : item))
    .reverse() // oldest first

  if (lastMessageId) {
    // Cursor-based: find the index of the last seen message and return everything after
    const idx = all.findIndex(
      (m: { id?: string; platform?: string }) =>
        `${m.id ?? ""}:${m.platform ?? ""}` === lastMessageId ||
        m.id === lastMessageId
    )
    if (idx >= 0) {
      return all.slice(idx + 1)
    }
    // If cursor not found, fall back to timestamp-based
  }

  // Timestamp-based fallback
  return all.filter((e: { _ts: number }) => e._ts > since)
}
