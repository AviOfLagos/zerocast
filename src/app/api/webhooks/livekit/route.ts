import { WebhookReceiver } from "livekit-server-sdk"
import { NextResponse } from "next/server"

import { inferPlatformFromUrl } from "@/lib/egress"
import { publishEvent, redis } from "@/lib/redis"

/**
 * F-24: LiveKit egress webhook handler.
 *
 * Two responsibilities:
 *   1. Verify the signed payload via `WebhookReceiver(apiKey, apiSecret)`.
 *   2. On `egress_updated`, scan the per-destination `streamResults` for
 *      any FAILED entries. When one platform fails while others are still
 *      ACTIVE, publish a `PLATFORM_STREAM_DROPPED` SSE event so the host
 *      can choose to reconnect or skip without the egress as a whole
 *      tearing down.
 *
 * Deduplication: each (egressId, platform) pair gets a 60s Redis flag so
 * a single drop event does not generate a banner storm if LiveKit
 * re-broadcasts the same updated state multiple times.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) {
    console.error("[webhooks/livekit] Missing LIVEKIT_API_KEY / LIVEKIT_API_SECRET")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  // LiveKit signs the raw body — read it as text, not parsed JSON, otherwise
  // the canonical string the signature was computed over no longer matches.
  const rawBody = await req.text().catch(() => "")
  const authHeader = req.headers.get("authorization") ?? undefined

  let event
  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret)
    event = await receiver.receive(rawBody, authHeader)
  } catch (err) {
    console.warn("[webhooks/livekit] Signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // Only inspect egress events. Room / participant / track / ingress events
  // are not relevant to per-destination drop detection.
  if (event.event !== "egress_updated" && event.event !== "egress_ended") {
    return NextResponse.json({ ok: true })
  }

  const egress = event.egressInfo
  if (!egress?.roomName || !egress?.egressId) {
    return NextResponse.json({ ok: true })
  }

  // StreamInfo.Status enum: ACTIVE=0, FINISHED=1, FAILED=2.
  const STREAM_FAILED = 2
  const results = egress.streamResults ?? []
  if (results.length === 0) return NextResponse.json({ ok: true })

  const failed = results.filter((s) => s.status === STREAM_FAILED)
  if (failed.length === 0) return NextResponse.json({ ok: true })

  // Don't broadcast a per-platform drop if every destination is down — that
  // is a full STREAM_ERROR scenario which the stream-live POST already
  // handles via egress error toasts + the persistent banner.
  if (failed.length === results.length) return NextResponse.json({ ok: true })

  for (const stream of failed) {
    const platform = inferPlatformFromUrl(stream.url ?? "")
    if (!platform) continue

    // Dedup: only notify once per (egressId, platform) within a 60s window.
    const dedupKey = `room:${egress.roomName}:dropped_notified:${egress.egressId}:${platform}`
    const set = await redis.set(dedupKey, "1", { ex: 60, nx: true }).catch(() => null)
    if (!set) continue // Already notified — skip.

    await publishEvent(egress.roomName, {
      type: "PLATFORM_STREAM_DROPPED",
      data: {
        platform,
        reason: stream.error || "Platform stopped accepting your stream.",
      },
    }).catch((err) => console.warn("[webhooks/livekit] publish failed:", err))
  }

  return NextResponse.json({ ok: true })
}
