"use client"

import React, { useCallback, useMemo, useState } from "react"

import type { Participant } from "livekit-client"
import { Mic, MicOff, Video, VideoOff, UserX } from "lucide-react"
import { toast } from "sonner"

import { useStudioStore } from "@/store/studio"

interface ParticipantRowProps {
  participant: Participant
  isOnStage: boolean
  roomCode: string
  hostToken?: string
}

const ParticipantRow = React.memo(function ParticipantRow({
  participant,
  isOnStage,
  roomCode,
  hostToken,
}: ParticipantRowProps) {
  const bringOnStage = useStudioStore((s) => s.bringOnStage)
  const sendToBackstage = useStudioStore((s) => s.sendToBackstage)
  const displayName = participant.name ?? participant.identity ?? "Guest"
  const initial = displayName.charAt(0).toUpperCase()
  const micOn = participant.isMicrophoneEnabled
  const camOn = participant.isCameraEnabled
  const isHost = participant.identity?.startsWith("host-")
  const [acting, setActing] = useState(false)

  const authHeaders = useMemo<Record<string, string>>(() => ({
    "Content-Type": "application/json",
    ...(hostToken ? { Authorization: `Bearer ${hostToken}` } : {}),
  }), [hostToken])

  const handleStageToggle = useCallback(() => {
    if (isOnStage) {
      sendToBackstage(participant.identity)
    } else {
      bringOnStage(participant.identity)
    }
  }, [isOnStage, participant.identity, bringOnStage, sendToBackstage])

  const handleMuteMic = useCallback(async () => {
    if (isHost || acting) return
    setActing(true)
    try {
      const res = await fetch(`/api/rooms/${roomCode}/mute`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          identity: participant.identity,
          trackType: "audio",
          muted: micOn, // toggle: if on → mute, if off → unmute
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Failed to toggle mic")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActing(false)
    }
  }, [roomCode, participant.identity, micOn, isHost, acting, authHeaders])

  const handleMuteCam = useCallback(async () => {
    if (isHost || acting) return
    setActing(true)
    try {
      const res = await fetch(`/api/rooms/${roomCode}/mute`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          identity: participant.identity,
          trackType: "video",
          muted: camOn,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Failed to toggle camera")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActing(false)
    }
  }, [roomCode, participant.identity, camOn, isHost, acting, authHeaders])

  const handleKick = useCallback(async () => {
    if (isHost || acting) return
    if (!confirm(`Remove ${displayName} from the studio?`)) return
    setActing(true)
    try {
      const res = await fetch(`/api/rooms/${roomCode}/kick`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ identity: participant.identity, name: displayName }),
      })
      if (res.ok) {
        sendToBackstage(participant.identity)
        toast.success(`${displayName} removed`)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Failed to remove participant")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActing(false)
    }
  }, [roomCode, participant.identity, displayName, isHost, acting, authHeaders, sendToBackstage])

  return (
    <div className="flex flex-col items-center gap-1 shrink-0 w-[5.5rem] group relative">
      {/* Avatar */}
      <div className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold text-white select-none shrink-0">
        {initial}
        {/* Mic dot */}
        <span
          className={[
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#080808]",
            micOn ? "bg-emerald-400" : "bg-gray-600",
          ].join(" ")}
          title={micOn ? "Mic on" : "Mic off"}
        />
      </div>

      {/* Name */}
      <span className="text-[10px] text-gray-400 truncate w-full text-center leading-tight">
        {displayName}
        {isHost && <span className="text-violet-400 ml-0.5">★</span>}
      </span>

      {/* Moderation buttons (guests only) */}
      {!isHost && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleMuteMic}
            disabled={acting}
            aria-label={micOn ? `Mute ${displayName}'s mic` : `Unmute ${displayName}'s mic`}
            className={[
              "p-1 rounded transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080808]",
              micOn
                ? "text-emerald-400 hover:bg-emerald-500/15"
                : "text-gray-600 hover:bg-white/6",
            ].join(" ")}
            title={micOn ? "Mute mic" : "Unmute mic"}
          >
            {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleMuteCam}
            disabled={acting}
            aria-label={camOn ? `Turn off ${displayName}'s camera` : `Turn on ${displayName}'s camera`}
            className={[
              "p-1 rounded transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080808]",
              camOn
                ? "text-emerald-400 hover:bg-emerald-500/15"
                : "text-gray-600 hover:bg-white/6",
            ].join(" ")}
            title={camOn ? "Turn off camera" : "Turn on camera"}
          >
            {camOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={handleKick}
            disabled={acting}
            aria-label={`Remove ${displayName} from studio`}
            className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080808]"
            title="Remove from studio"
          >
            <UserX className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Stage / Backstage button */}
      {isOnStage ? (
        <button
          type="button"
          onClick={handleStageToggle}
          aria-label={`Send ${displayName} to backstage`}
          className="bg-white/6 text-gray-400 hover:bg-white/10 hover:text-white px-2.5 py-0.5 rounded text-[10px] min-w-[60px] text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080808]"
        >
          Backstage
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStageToggle}
          aria-label={`Bring ${displayName} on stage`}
          className="bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 px-2.5 py-0.5 rounded text-[10px] min-w-[60px] text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#080808]"
        >
          Stage
        </button>
      )}
    </div>
  )
})

export default ParticipantRow
