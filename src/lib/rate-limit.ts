import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// ── Redis instance for rate limiting (reuses same Upstash credentials) ──────

function getRateLimitRedis(): Redis {
  return new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL ?? "").trim(),
    token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
  })
}

// ── Rate limiter instances (sliding window) ─────────────────────────────────

const limiters: Record<string, Ratelimit> = {}

function getLimiter(type: string, tokens: number, window: string): Ratelimit {
  if (!limiters[type]) {
    limiters[type] = new Ratelimit({
      redis: getRateLimitRedis(),
      limiter: Ratelimit.slidingWindow(tokens, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
      prefix: `ratelimit:${type}`,
    })
  }
  return limiters[type]
}

// ── Limiter configurations ──────────────────────────────────────────────────

const LIMITER_CONFIGS: Record<string, { tokens: number; window: string }> = {
  "rooms:create":       { tokens: 5,  window: "1m" },
  "rooms:request":      { tokens: 3,  window: "1m" },
  "rooms:chat-connect": { tokens: 2,  window: "1m" },
  "platforms:connect":  { tokens: 5,  window: "1m" },
  "rooms:stream":       { tokens: 3,  window: "1m" },
  "rooms:record":       { tokens: 5,  window: "60s" },
  "guest:chat-send":    { tokens: 10, window: "30s" },
  // Phase 4 — generous limits for host-only endpoints
  "rooms:admit":        { tokens: 30, window: "1m" },
  "rooms:deny":         { tokens: 30, window: "1m" },
  "rooms:end":          { tokens: 10, window: "1m" },
  "rooms:pause":        { tokens: 10, window: "1m" },
  "rooms:viewer-counts":{ tokens: 30, window: "1m" },
  "rooms:reconnect":    { tokens: 10, window: "1m" },
  "rooms:kick":         { tokens: 30, window: "1m" },
  "rooms:mute":         { tokens: 30, window: "1m" },
  "rooms:leave":        { tokens: 30, window: "1m" },
  "rooms:chat-send":    { tokens: 30, window: "1m" },
  "rooms:ai-respond":   { tokens: 20, window: "1m" },
  "rooms:events-since": { tokens: 60, window: "1m" },
  "rooms:state":        { tokens: 60, window: "1m" },
  "platforms:disconnect":{ tokens: 20, window: "1m" },
  "platforms:refresh":  { tokens: 20, window: "1m" },
  "platforms:custom-rtmp":{ tokens: 10, window: "1m" },
  "feedback:submit":    { tokens: 5,  window: "1m" },
  "errors:ingest":      { tokens: 30, window: "1m" },
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean
  remaining: number
  limit: number
  reset: number
}

/**
 * Check rate limit for a given identifier and limiter type.
 * Fail-open: if Redis is unreachable, the request is allowed.
 */
export async function checkRateLimit(
  identifier: string,
  limiterType: string,
): Promise<RateLimitResult> {
  try {
    const config = LIMITER_CONFIGS[limiterType]
    if (!config) {
      // Unknown limiter type — fail open
      return { success: true, remaining: 1, limit: 1, reset: 0 }
    }

    const limiter = getLimiter(limiterType, config.tokens, config.window)
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      remaining: result.remaining,
      limit: result.limit,
      reset: result.reset,
    }
  } catch (err) {
    // Fail open — never block legitimate users because rate limiter is broken
    console.warn("[RateLimit] Redis error, failing open:", err)
    return { success: true, remaining: 1, limit: 1, reset: 0 }
  }
}

/**
 * Extract client IP from request headers (Vercel sets x-forwarded-for).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    // x-forwarded-for can be comma-separated; take the first (client) IP
    return forwarded.split(",")[0].trim()
  }
  return "unknown"
}

/**
 * Rate-limit guard — returns a 429 NextResponse if over limit, or null if allowed.
 * Attaches standard rate-limit headers on the 429 response.
 */
export async function rateLimitGuard(
  identifier: string,
  limiterType: string,
): Promise<Response | null> {
  const rl = await checkRateLimit(identifier, limiterType)
  if (!rl.success) {
    const { NextResponse } = await import("next/server")
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      },
    )
  }
  return null
}
