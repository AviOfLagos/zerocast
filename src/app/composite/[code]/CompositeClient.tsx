"use client"

import { useEffect, useState } from "react"

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from "@livekit/components-react"
import { RoomEvent, Track } from "livekit-client"

import CompositeStage from "@/components/studio/CompositeStage"
import { LAYOUT_PRESETS } from "@/lib/layout/presets"
import {
  useStudioStore,
  type ChatOverlayPosition,
  type StudioLayout,
  type TextOverlay,
} from "@/store/studio"

interface CompositeClientProps {
  roomCode: string
  livekitUrl: string
  token: string
}

function CompositeInner() {
  const tracks = useTracks(
    [
      // Composite egress should not render empty placeholder tiles — only show
      // participants that actually have a published camera track.
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <CompositeStage tracks={tracks} isHost={false} />
      <RoomAudioRenderer />
    </div>
  )
}

// Subscribes to LiveKit data messages and applies LAYOUT_CHANGE payloads to the
// local zustand studio store so the composite renders exactly like the host's view.
function LayoutHydrator() {
  const room = useRoomContext()
  const setLayout = useStudioStore((s) => s.setLayout)
  const setPinned = useStudioStore((s) => s.setPinned)
  const setTileOrder = useStudioStore((s) => s.setTileOrder)
  const setStageBackground = useStudioStore((s) => s.setStageBackground)
  const setChatOverlayEnabled = useStudioStore((s) => s.setChatOverlayEnabled)
  const setChatOverlayPosition = useStudioStore((s) => s.setChatOverlayPosition)

  useEffect(() => {
    if (!room) return
    const decoder = new TextDecoder()

    const handler = (payload: Uint8Array) => {
      let msg: Record<string, unknown>
      try {
        msg = JSON.parse(decoder.decode(payload)) as Record<string, unknown>
      } catch {
        // Malformed data — ignore.
        return
      }

      if (msg.type !== "LAYOUT_CHANGE") return

      // activeLayout — guard against unknown preset ids from stale snapshots.
      if (typeof msg.layout === "string" && msg.layout in LAYOUT_PRESETS) {
        setLayout(msg.layout as StudioLayout)
      }

      // pinnedParticipantId — explicit null is a valid value (unpin).
      if (msg.pinnedParticipantId === null || typeof msg.pinnedParticipantId === "string") {
        setPinned(msg.pinnedParticipantId)
      }

      if (Array.isArray(msg.tileOrder)) {
        setTileOrder(msg.tileOrder as string[])
      }

      if (Array.isArray(msg.onScreenParticipantIds)) {
        // No public setter — write directly to the store.
        useStudioStore.setState({
          onScreenParticipantIds: msg.onScreenParticipantIds as string[],
        })
      }

      if (Array.isArray(msg.textOverlays)) {
        // No public setter that replaces the whole array — write directly.
        useStudioStore.setState({
          textOverlays: msg.textOverlays as TextOverlay[],
        })
      }

      if (typeof msg.stageBackground === "string") {
        setStageBackground(msg.stageBackground)
      }

      if (typeof msg.chatOverlayEnabled === "boolean") {
        setChatOverlayEnabled(msg.chatOverlayEnabled)
      }

      const validPositions: ChatOverlayPosition[] = [
        "bottom-left",
        "bottom-right",
        "top-left",
        "top-right",
      ]
      if (
        typeof msg.chatOverlayPosition === "string" &&
        validPositions.includes(msg.chatOverlayPosition as ChatOverlayPosition)
      ) {
        setChatOverlayPosition(msg.chatOverlayPosition as ChatOverlayPosition)
      }
    }

    room.on(RoomEvent.DataReceived, handler)
    return () => {
      room.off(RoomEvent.DataReceived, handler)
    }
  }, [
    room,
    setLayout,
    setPinned,
    setTileOrder,
    setStageBackground,
    setChatOverlayEnabled,
    setChatOverlayPosition,
  ])

  return null
}

// roomCode is accepted but not used directly here — LiveKit room membership is
// driven entirely by the `token`'s embedded room grant. It's kept on the prop
// surface for future use (e.g. fetching room metadata for the composite).
export default function CompositeClient({ livekitUrl, token }: CompositeClientProps) {
  // Track connection errors so headless Chrome can show *something* instead of
  // a blank black frame when LiveKit rejects the token.
  const [connectError, setConnectError] = useState<string | null>(null)

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect
      audio={false}
      video={false}
      options={{ adaptiveStream: true, dynacast: true }}
      onError={(err) => setConnectError(err.message)}
    >
      <LayoutHydrator />
      <CompositeInner />
      {connectError && (
        <div className="fixed bottom-4 left-4 right-4 z-50 text-center text-xs text-red-300 bg-red-900/70 border border-red-500/40 rounded px-3 py-2">
          LiveKit error: {connectError}
        </div>
      )}
    </LiveKitRoom>
  )
}
