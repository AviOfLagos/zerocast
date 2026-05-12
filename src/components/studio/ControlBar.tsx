"use client"

import { useEffect, useState } from "react"

import { type ToggleSource } from "@livekit/components-core"
import { useTrackToggle } from "@livekit/components-react"
import { Mic, MicOff, Monitor, MonitorOff, Video, VideoOff } from "lucide-react"
import { Track } from "livekit-client"

import { useStudioStore } from "@/store/studio"

import { LocalAudioLevel } from "./AudioLevelIndicator"

interface TrackButtonProps {
  source: ToggleSource
  onIcon: React.ReactNode
  offIcon: React.ReactNode
  onLabel: string
  offLabel: string
}

function TrackButton({ source, onIcon, offIcon, onLabel, offLabel }: TrackButtonProps) {
  const { buttonProps, enabled } = useTrackToggle({ source })
  return (
    <button
      {...buttonProps}
      type="button"
      title={enabled ? onLabel : offLabel}
      className={[
        "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all text-[11px] font-medium min-w-[52px] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]",
        enabled
          ? "bg-white/6 text-gray-300 hover:bg-white/10 hover:text-white"
          : "bg-red-500/10 text-red-400 hover:bg-red-500/20",
      ].join(" ")}
    >
      <span className="w-5 h-5 flex items-center justify-center">
        {enabled ? onIcon : offIcon}
      </span>
      <span className="hidden sm:inline">{enabled ? onLabel : offLabel}</span>
    </button>
  )
}

function useElapsedTime(startedAt: Date | null): string {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const m = Math.floor(elapsed / 60).toString().padStart(2, "0")
  const s = (elapsed % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

interface ControlBarProps {
  roomCode: string
}

export default function ControlBar({ roomCode }: ControlBarProps) {
  const { isRecording, recordingEgressId, recordingStartedAt, setRecordingState } = useStudioStore()
  const [recordBusy, setRecordBusy] = useState(false)
  const recElapsed = useElapsedTime(recordingStartedAt)

  const handleToggleRecord = async () => {
    if (recordBusy) return
    setRecordBusy(true)
    try {
      if (isRecording && recordingEgressId) {
        const res = await fetch(`/api/rooms/${roomCode}/record`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ egressId: recordingEgressId }),
        })
        if (res.ok) {
          setRecordingState(false, null, null)
        } else {
          const data = await res.json().catch(() => ({}))
          console.error("[ControlBar] Stop recording failed:", data)
        }
      } else {
        const res = await fetch(`/api/rooms/${roomCode}/record`, { method: "POST" })
        if (res.ok) {
          const data = await res.json()
          setRecordingState(true, data.egressId, new Date())
        } else {
          const data = await res.json().catch(() => ({}))
          console.error("[ControlBar] Start recording failed:", data)
        }
      }
    } finally {
      setRecordBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-2 bg-[#080808] border-t border-white/6 gap-2">
      <TrackButton
        source={Track.Source.Microphone}
        onIcon={<Mic className="w-5 h-5" />}
        offIcon={<MicOff className="w-5 h-5" />}
        onLabel="Mic"
        offLabel="Muted"
      />
      <LocalAudioLevel barCount={5} />
      <TrackButton
        source={Track.Source.Camera}
        onIcon={<Video className="w-5 h-5" />}
        offIcon={<VideoOff className="w-5 h-5" />}
        onLabel="Camera"
        offLabel="Cam off"
      />
      <TrackButton
        source={Track.Source.ScreenShare}
        onIcon={<Monitor className="w-5 h-5" />}
        offIcon={<MonitorOff className="w-5 h-5" />}
        onLabel="Screen"
        offLabel="Screen"
      />
      <button
        type="button"
        onClick={handleToggleRecord}
        disabled={recordBusy}
        className={[
          "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all text-[11px] font-medium min-w-[52px] select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]",
          isRecording
            ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
            : "bg-white/6 text-gray-300 hover:bg-white/10 hover:text-white",
        ].join(" ")}
        title={isRecording ? "Stop recording" : "Start recording"}
      >
        <span className="w-5 h-5 flex items-center justify-center">
          {isRecording ? (
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
          ) : (
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="10" cy="10" r="7" />
              <circle cx="10" cy="10" r="3.5" fill="currentColor" stroke="none" />
            </svg>
          )}
        </span>
        <span className="hidden sm:inline">{isRecording ? `REC ${recElapsed}` : "Record"}</span>
      </button>
    </div>
  )
}
