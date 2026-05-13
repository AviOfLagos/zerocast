"use client"

import { useConnectionQualityIndicator, useLocalParticipant } from "@livekit/components-react"
import { ConnectionQuality } from "livekit-client"
import { AlertTriangle, CheckCircle2 } from "lucide-react"

interface PreFlightChecklistProps {
  /** Set of selected platform identifiers (lowercased) we'll stream to. */
  selectedPlatforms: Set<string>
  /** Title from the room — drives the YouTube metadata check. */
  streamTitle?: string
}

interface CheckItem {
  ok: boolean
  /** When false the host gets a warning row; gone when ok. */
  warning: string
  /** Short verb showing what fails. */
  label: string
}

/**
 * Quick pre-flight checks that surface common "about-to-go-live" mistakes.
 * Renders only the failing rows so a clean studio shows nothing — the host
 * isn't distracted when everything is ready.
 */
export default function PreFlightChecklist({ selectedPlatforms, streamTitle }: PreFlightChecklistProps) {
  const { localParticipant } = useLocalParticipant()
  const { quality } = useConnectionQualityIndicator({ participant: localParticipant })

  const micOn = localParticipant?.isMicrophoneEnabled ?? false
  const camOn = localParticipant?.isCameraEnabled ?? false
  const networkBad = quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost
  const youtubeWithoutTitle =
    selectedPlatforms.has("YOUTUBE") || selectedPlatforms.has("youtube")
      ? !streamTitle || streamTitle.trim().length === 0
      : false

  const checks: CheckItem[] = [
    {
      ok: micOn,
      warning: "Your microphone is muted — viewers will hear silence.",
      label: "Microphone",
    },
    {
      ok: camOn,
      warning: "Your camera is off — viewers will only see screenshare or text overlays.",
      label: "Camera",
    },
    {
      ok: !networkBad,
      warning: "Network quality is poor — consider waiting or lowering your video resolution.",
      label: "Network",
    },
    {
      ok: !youtubeWithoutTitle,
      warning: "YouTube is selected but no stream title is set — YouTube viewers may see a generic title.",
      label: "Title",
    },
  ]

  const failing = checks.filter((c) => !c.ok)
  const allOk = failing.length === 0

  if (allOk) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 mt-1">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
        <p className="text-[11px] text-emerald-300 leading-tight">All checks pass — you&apos;re ready to go live.</p>
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label="Pre-flight warnings"
      className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 mt-1 space-y-1.5"
    >
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
        <p className="text-[11px] font-semibold text-amber-300">
          {failing.length} pre-flight {failing.length === 1 ? "warning" : "warnings"}
        </p>
      </div>
      <ul className="space-y-1 ml-5 list-disc text-[11px] text-amber-200/90 marker:text-amber-500/60">
        {failing.map((c) => (
          <li key={c.label}>{c.warning}</li>
        ))}
      </ul>
      <p className="text-[10px] text-amber-300/70 leading-snug pl-5">
        You can still go live — these are reminders, not blockers.
      </p>
    </div>
  )
}
