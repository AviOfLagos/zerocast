"use client"

import React, { useCallback } from "react"

import { TrackRefContext, VideoTrack, useEnsureTrackRef, useIsSpeaking, type TrackReference, type TrackReferenceOrPlaceholder } from "@livekit/components-react"
import { Eye, EyeOff } from "lucide-react"

import { useStudioStore } from "@/store/studio"

interface VideoTileProps {
  trackRef: TrackReferenceOrPlaceholder
  isVisible: boolean
  isLocal?: boolean
  isHost?: boolean
}

function isTrackReference(ref: TrackReferenceOrPlaceholder): ref is TrackReference {
  return ref.publication !== undefined
}

function VideoTileInner({ trackRef, isVisible, isLocal, isHost }: VideoTileProps) {
  const ensuredRef = useEnsureTrackRef(trackRef)
  const isSpeaking = useIsSpeaking(trackRef.participant)
  const bringOnStage = useStudioStore((s) => s.bringOnStage)
  const sendToBackstage = useStudioStore((s) => s.sendToBackstage)

  const displayName = trackRef.participant?.name ?? trackRef.participant?.identity ?? "Guest"
  const participantId = trackRef.participant?.identity ?? ""

  const hasVideo =
    isTrackReference(ensuredRef) &&
    (ensuredRef.publication?.isSubscribed || trackRef.participant?.isLocal)

  const handleToggle = useCallback(() => {
    // Toggle between on-stage and backstage
    const ids = useStudioStore.getState().onScreenParticipantIds
    if (ids.includes(participantId)) {
      sendToBackstage(participantId)
    } else {
      bringOnStage(participantId)
    }
  }, [participantId, bringOnStage, sendToBackstage])

  if (!isVisible) return null

  return (
    <TrackRefContext.Provider value={ensuredRef}>
      <div
        className={[
          "group relative bg-[#1a1a1a] rounded-xl overflow-hidden aspect-video flex items-center justify-center",
          isSpeaking ? "ring-2 ring-violet-500/70" : "ring-1 ring-white/4",
        ].join(" ")}
      >
        {hasVideo ? (
          <VideoTrack
            trackRef={ensuredRef as TrackReference}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-semibold text-white select-none">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-500 text-xs">Camera off</span>
          </div>
        )}

        {/* Name label */}
        <div className="absolute bottom-2 left-2 right-12 flex items-center gap-1.5 min-w-0">
          {isSpeaking && (
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
          )}
          <span className="text-white text-[11px] font-medium bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm truncate max-w-full">
            {isLocal ? `${displayName} (You)` : displayName}
          </span>
        </div>

        {/* Host-only: on-screen toggle */}
        {isHost && !isLocal && (
          <button
            type="button"
            onClick={handleToggle}
            className="absolute top-2 right-2 p-1 rounded-lg bg-black/50 backdrop-blur-sm text-gray-400 hover:text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            aria-label={`Toggle on-screen for ${displayName}`}
            title="Toggle on screen"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </TrackRefContext.Provider>
  )
}

const VideoTile = React.memo(VideoTileInner)
export default VideoTile

/** Tile shown when a participant is toggled off-screen by the host */
function OffScreenTileInner({ trackRef, isHost }: { trackRef: TrackReferenceOrPlaceholder; isHost?: boolean }) {
  const bringOnStage = useStudioStore((s) => s.bringOnStage)
  const displayName = trackRef.participant?.name ?? trackRef.participant?.identity ?? "Guest"
  const participantId = trackRef.participant?.identity ?? ""

  const handleBringOnStage = useCallback(() => {
    bringOnStage(participantId)
  }, [bringOnStage, participantId])

  if (!isHost) return null

  return (
    <div className="relative bg-[#111] rounded-xl overflow-hidden aspect-video flex items-center justify-center ring-1 ring-white/4 opacity-40">
      <div className="flex flex-col items-center gap-2">
        <EyeOff className="w-6 h-6 text-gray-600" />
        <span className="text-gray-600 text-xs">{displayName}</span>
      </div>
      <button
        type="button"
        onClick={handleBringOnStage}
        aria-label={`Bring ${displayName} on screen`}
        className="absolute top-2 right-2 p-1 rounded-lg bg-black/50 text-gray-500 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        title="Bring on screen"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export const OffScreenTile = React.memo(OffScreenTileInner)
