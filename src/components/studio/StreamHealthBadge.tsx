"use client"

import { useEffect, useState } from "react"

import { useConnectionQualityIndicator, useLocalParticipant } from "@livekit/components-react"
import { ConnectionQuality } from "livekit-client"
import { Radio } from "lucide-react"

import { useStudioStore } from "@/store/studio"

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Compact live-status badge for the studio header. Renders only when the
 * stream is live. Shows the elapsed duration + a network-quality dot so the
 * host has at-a-glance visibility into stream health while live. Must be
 * rendered inside a LiveKitRoom context.
 */
export default function StreamHealthBadge() {
  const isLive = useStudioStore((s) => s.isLive)
  const streamStartedAt = useStudioStore((s) => s.streamStartedAt)
  const streamPlatforms = useStudioStore((s) => s.streamPlatforms)
  const { localParticipant } = useLocalParticipant()
  const { quality } = useConnectionQualityIndicator({ participant: localParticipant })
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isLive || !streamStartedAt) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(Math.floor((Date.now() - streamStartedAt.getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isLive, streamStartedAt])

  if (!isLive) return null

  const platformLabel = streamPlatforms.length === 1
    ? streamPlatforms[0].toLowerCase()
    : `${streamPlatforms.length} platforms`

  let dotClass = "bg-emerald-400"
  let dotLabel = "Network: good"
  if (quality === ConnectionQuality.Poor) {
    dotClass = "bg-yellow-400 motion-safe:animate-pulse"
    dotLabel = "Network: poor"
  } else if (quality === ConnectionQuality.Lost || quality === ConnectionQuality.Unknown) {
    dotClass = "bg-red-400 motion-safe:animate-pulse"
    dotLabel = "Network: lost"
  }

  return (
    <div
      role="status"
      aria-label={`Live for ${formatDuration(elapsed)} on ${platformLabel}. ${dotLabel}.`}
      className="hidden sm:inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <Radio className="w-3 h-3" aria-hidden="true" />
      <span className="font-mono text-[10px] tabular-nums text-red-200">{formatDuration(elapsed)}</span>
      <span className="text-[9px] text-red-300/70 uppercase tracking-wider">{platformLabel}</span>
      <span
        title={dotLabel}
        aria-hidden="true"
        className={["w-1.5 h-1.5 rounded-full shrink-0", dotClass].join(" ")}
      />
    </div>
  )
}
