"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { type ToggleSource } from "@livekit/components-core"
import {
  useConnectionQualityIndicator,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  useTrackToggle,
} from "@livekit/components-react"
import {
  Check,
  Link2,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  WifiZero,
  X,
  Zap,
} from "lucide-react"
import { ConnectionQuality, ConnectionState, Participant, RoomEvent, Track } from "livekit-client"

import { LocalAudioLevel } from "@/components/studio/AudioLevelIndicator"
import ChatPanel from "@/components/chat/ChatPanel"
import ChatOverlay from "@/components/studio/ChatOverlay"
import DeviceSelector from "@/components/studio/DeviceSelector"
import TextOverlayRenderer from "@/components/studio/TextOverlayRenderer"
import VideoTile from "@/components/studio/VideoTile"
import { SSEEventDataSchema } from "@/lib/schemas/sse"
import { useChatStore } from "@/store/chat"
import type { ChatOverlayPosition, StudioLayout, TextOverlay } from "@/store/studio"

interface GuestStudioProps {
  roomCode: string
  displayName: string
  onKicked?: () => void
}

function gridCols(count: number) {
  if (count === 1) return "grid-cols-1"
  if (count <= 4) return "grid-cols-2"
  return "grid-cols-3"
}

// ─── Track toggle button ────────────────────────────────────────────────────

function GuestTrackButton({
  source,
  onIcon,
  offIcon,
  onLabel,
  offLabel,
}: {
  source: ToggleSource
  onIcon: React.ReactNode
  offIcon: React.ReactNode
  onLabel: string
  offLabel: string
}) {
  const { buttonProps, enabled } = useTrackToggle({ source })
  return (
    <button
      {...buttonProps}
      type="button"
      aria-label={enabled ? `${onLabel} (on, click to turn off)` : `${offLabel} (off, click to turn on)`}
      aria-pressed={enabled}
      title={enabled ? onLabel : offLabel}
      className={[
        "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-[11px] font-medium min-w-[52px] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg-deep",
        enabled
          ? "bg-white/6 text-gray-300 hover:bg-white/10 hover:text-white"
          : "bg-red-500/10 text-red-400 hover:bg-red-500/20",
      ].join(" ")}
    >
      <span className="w-5 h-5 flex items-center justify-center" aria-hidden="true">
        {enabled ? onIcon : offIcon}
      </span>
      <span className="hidden xs:inline">{enabled ? onLabel : offLabel}</span>
    </button>
  )
}

// ─── Screenshare toggle button ──────────────────────────────────────────────

function ScreenShareButton() {
  const { buttonProps, enabled } = useTrackToggle({ source: Track.Source.ScreenShare })
  return (
    <button
      {...buttonProps}
      type="button"
      aria-label={enabled ? "Stop sharing screen" : "Share screen"}
      aria-pressed={enabled}
      title={enabled ? "Stop sharing" : "Share screen"}
      className={[
        "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-[11px] font-medium min-w-[52px] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg-deep",
        enabled
          ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
          : "bg-white/6 text-gray-300 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      <span className="w-5 h-5 flex items-center justify-center" aria-hidden="true">
        {enabled ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
      </span>
      <span className="hidden xs:inline">{enabled ? "Stop" : "Share"}</span>
    </button>
  )
}

// ─── Connection monitor ─────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 5

function GuestConnectionMonitor({ wasKicked }: { wasKicked: boolean }) {
  const state = useConnectionState()
  const prevStateRef = useRef<ConnectionState>(ConnectionState.Connecting)
  const attemptCountRef = useRef(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectInProgressRef = useRef(false)

  useEffect(() => {
    const prev = prevStateRef.current

    if (state === ConnectionState.Reconnecting && prev !== ConnectionState.Reconnecting) {
      if (!reconnectInProgressRef.current) {
        reconnectInProgressRef.current = true
        attemptCountRef.current += 1
        setAttemptCount(attemptCountRef.current)
        setElapsedSecs(0)
      }
      if (!elapsedTimerRef.current) {
        elapsedTimerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000)
      }
    }

    if (
      state === ConnectionState.Connected &&
      (prev === ConnectionState.Reconnecting || prev === ConnectionState.Disconnected)
    ) {
      reconnectInProgressRef.current = false
      attemptCountRef.current = 0
      setAttemptCount(0)
      setElapsedSecs(0)
      if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    }

    if (state === ConnectionState.Disconnected && prev !== ConnectionState.Disconnected) {
      reconnectInProgressRef.current = false
      if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    }

    prevStateRef.current = state
  }, [state])

  useEffect(() => () => { if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current) }, [])

  if (wasKicked) return null

  if (state === ConnectionState.Connecting) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Connecting to studio"
        className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none"
      >
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full motion-safe:animate-spin mx-auto mb-2" />
          <p className="text-white text-sm">Connecting to studio...</p>
        </div>
      </div>
    )
  }

  if (state === ConnectionState.Reconnecting) {
    const exhausted = attemptCount > MAX_RECONNECT_ATTEMPTS
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={exhausted ? "Connection lost" : "Reconnecting to studio"}
        className="absolute inset-0 flex items-center justify-center bg-black/60 z-20"
      >
        <div className="text-center space-y-2 px-6">
          {exhausted ? (
            <>
              <p className="text-white font-semibold">Connection lost</p>
              <p className="text-gray-300 text-sm">
                Could not reconnect after {MAX_RECONNECT_ATTEMPTS} attempts.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-1.5 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"
              >
                Refresh to rejoin
              </button>
            </>
          ) : (
            <>
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full motion-safe:animate-spin mx-auto" />
              <p className="text-white font-semibold">
                Reconnecting... (attempt {attemptCount}/{MAX_RECONNECT_ATTEMPTS})
              </p>
              <p className="text-gray-400 text-sm">
                {elapsedSecs > 0 ? `${elapsedSecs}s elapsed` : "Hang tight..."}
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (state === ConnectionState.Disconnected) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Connection lost"
        className="absolute inset-0 flex items-center justify-center bg-black/70 z-20"
      >
        <div className="text-center space-y-3 px-6">
          <p className="text-white font-semibold">Connection lost</p>
          <p className="text-gray-300 text-sm">The studio connection was permanently dropped.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"
          >
            Refresh to rejoin
          </button>
        </div>
      </div>
    )
  }

  return null
}

// ─── Network quality indicator ──────────────────────────────────────────────

function GuestNetworkQualityIndicator() {
  const { localParticipant } = useLocalParticipant()
  const { quality } = useConnectionQualityIndicator({ participant: localParticipant })

  let icon: React.ReactNode
  let label: string
  let colorClass: string

  if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
    icon = <Wifi className="w-3.5 h-3.5" />
    label = quality === ConnectionQuality.Excellent ? "Network: Excellent" : "Network: Good"
    colorClass = "text-emerald-400"
  } else if (quality === ConnectionQuality.Poor) {
    icon = <WifiZero className="w-3.5 h-3.5" />
    label = "Network: Poor"
    colorClass = "text-yellow-400"
  } else {
    icon = <WifiOff className="w-3.5 h-3.5" />
    label = "Network: Critical"
    colorClass = "text-red-400"
  }

  return (
    <span title={label} className={`inline-flex items-center ${colorClass}`} aria-label={label}>
      {icon}
    </span>
  )
}

// ─── Backstage participant list ─────────────────────────────────────────────

function ParticipantRow({ participant, localIdentity }: { participant: Participant; localIdentity: string }) {
  const isSpeaking = participant.isSpeaking
  const micEnabled = participant.isMicrophoneEnabled
  const camEnabled = participant.isCameraEnabled
  const isLocal = participant.identity === localIdentity

  let role: "Host" | "Guest" = "Guest"
  try {
    const meta = participant.metadata ? JSON.parse(participant.metadata) : {}
    if (meta.role === "host") role = "Host"
  } catch { /* ignore malformed metadata */ }

  const initial = (participant.name ?? participant.identity ?? "?")[0].toUpperCase()

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/3 transition-colors rounded-lg mx-1">
      {/* Avatar with speaking indicator */}
      <div className="relative flex-none">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
          style={{ backgroundColor: role === "Host" ? "#7c3aed40" : "#06b6d440" }}
        >
          {initial}
        </div>
        {isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-1 ring-[#0d0d0d] motion-safe:animate-pulse" />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-200 truncate">
          {participant.name ?? participant.identity}
          {isLocal && <span className="text-gray-600 font-normal"> (you)</span>}
        </p>
      </div>

      {/* Role badge */}
      <span
        className={[
          "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
          role === "Host"
            ? "bg-indigo-500/20 text-indigo-400"
            : "bg-cyan-500/20 text-cyan-400",
        ].join(" ")}
      >
        {role}
      </span>

      {/* Mic / camera status dots */}
      <div className="flex items-center gap-1 shrink-0">
        <span
          title={micEnabled ? "Mic on" : "Mic off"}
          className={`w-1.5 h-1.5 rounded-full ${micEnabled ? "bg-emerald-400" : "bg-gray-700"}`}
        />
        <span
          title={camEnabled ? "Camera on" : "Camera off"}
          className={`w-1.5 h-1.5 rounded-full ${camEnabled ? "bg-emerald-400" : "bg-gray-700"}`}
        />
      </div>
    </div>
  )
}

function BackstagePanel({ participants, localIdentity, onClose }: {
  participants: Participant[]
  localIdentity: string
  onClose?: () => void
}) {
  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      <div className="flex-none flex items-center gap-2 px-3 py-2.5 border-b border-white/6">
        <Users className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-semibold text-white tracking-wide">Participants</span>
        <span className="text-[10px] text-gray-600 tabular-nums">{participants.length}</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/6 transition-colors"
            aria-label="Close participants panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1 [scrollbar-width:thin] [scrollbar-color:#ffffff10_transparent]">
        {participants.length === 0 ? (
          <p className="text-center text-gray-700 text-[11px] py-6">No participants</p>
        ) : (
          participants.map((p) => (
            <ParticipantRow key={p.identity} participant={p} localIdentity={localIdentity} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Copy link button ───────────────────────────────────────────────────────

function CopyLinkButton({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const url = `${window.location.origin}/join/${roomCode}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = url
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy room link"
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/6 transition-colors text-[11px]"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 hidden sm:inline">Copied!</span>
        </>
      ) : (
        <>
          <Link2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Copy link</span>
        </>
      )}
    </button>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function GuestStudio({ roomCode, displayName, onKicked }: GuestStudioProps) {
  const { localParticipant } = useLocalParticipant()
  const room = useRoomContext()

  // chatOpen: mobile overlay toggle (< lg screens)
  const [chatOpen, setChatOpen] = useState(false)
  // chatCollapsed: desktop sidebar collapse (lg+ screens)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  // unreadCount: messages received while desktop chat is collapsed
  const [unreadCount, setUnreadCount] = useState(0)
  // backstageOpen: mobile participant list overlay
  const [backstageOpen, setBackstageOpen] = useState(false)

  // Layout state mirrored from the host via LiveKit data messages
  const [activeLayout, setActiveLayout] = useState<StudioLayout>("four-grid")
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null)
  const [onScreenParticipantIds, setOnScreenParticipantIds] = useState<string[]>([])
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([])
  const [stageBackground, setStageBackground] = useState("#0d0d0d")
  const [chatOverlayEnabled, setChatOverlayEnabled] = useState(false)
  const [chatOverlayPosition, setChatOverlayPosition] = useState<ChatOverlayPosition>("bottom-left")

  // Keep a stable ref so the RoomEvent listener never captures a stale callback
  const onKickedRef = useRef(onKicked)
  useEffect(() => { onKickedRef.current = onKicked }, [onKicked])

  // Track kick state so GuestConnectionMonitor suppresses its overlay when kicked
  const wasKickedInternalRef = useRef(false)

  // ── Guest chat relay ───────────────────────────────────────────────────────
  const handleGuestSend = useCallback(async (message: string) => {
    try {
      await fetch(`/api/rooms/${roomCode}/chat/guest-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, displayName }),
      })
    } catch {
      // Silent fail — message already shown locally via optimistic update
    }
  }, [roomCode, displayName])

  const participants = useParticipants()
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )
  const addMessage = useChatStore((s) => s.addMessage)

  // Ref to read chatCollapsed inside data channel handler without stale closure
  const chatCollapsedRef = useRef(chatCollapsed)
  useEffect(() => { chatCollapsedRef.current = chatCollapsed }, [chatCollapsed])

  // Listen for LiveKit data messages: KICKED + LAYOUT_CHANGE + ROOM_EVENT (relay from host)
  useEffect(() => {
    if (!room) return
    const decoder = new TextDecoder()

    const handleRoomEvent = (inner: Record<string, unknown>) => {
      // STUDIO_ENDED — redirect immediately
      if (inner.type === "STUDIO_ENDED") {
        window.location.href = "/studio-ended"
        return
      }
      // STUDIO_PAUSED — host paused; redirect to paused landing. Guest can
      // rejoin via the same /join/<code> URL once the host resumes.
      if (inner.type === "STUDIO_PAUSED") {
        window.location.href = "/studio-paused"
        return
      }
      // CHAT_MESSAGE — add to chat store
      if (inner.type === "CHAT_MESSAGE") {
        const parsed = SSEEventDataSchema.safeParse(inner)
        if (parsed.success && parsed.data.type === "CHAT_MESSAGE") {
          addMessage(parsed.data.data)
          if (chatCollapsedRef.current) {
            setUnreadCount((n) => n + 1)
          }
        }
        return
      }
      // All other event types (STREAM_STARTED, GUEST_LEFT, etc.) are host-only
      // actions; guests don't need to act on them, so we silently ignore them.
    }

    const handler = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(decoder.decode(payload)) as Record<string, unknown>

        if (msg.type === "KICKED") {
          wasKickedInternalRef.current = true
          onKickedRef.current?.()
          return
        }

        if (msg.type === "LAYOUT_CHANGE") {
          const validLayouts: StudioLayout[] = ["four-grid", "spotlight-side-strip", "screen-with-strip", "screen-presenter-pip", "solo"]
          const layout = msg.layout as StudioLayout
          if (validLayouts.includes(layout)) {
            setActiveLayout(layout)
          }
          setPinnedParticipantId((msg.pinnedParticipantId as string | null) ?? null)
          if (Array.isArray(msg.onScreenParticipantIds)) {
            setOnScreenParticipantIds(msg.onScreenParticipantIds as string[])
          }
          if (Array.isArray(msg.textOverlays)) {
            setTextOverlays(msg.textOverlays as TextOverlay[])
          }
          if (typeof msg.stageBackground === "string") {
            setStageBackground(msg.stageBackground)
          }
          if (typeof msg.chatOverlayEnabled === "boolean") {
            setChatOverlayEnabled(msg.chatOverlayEnabled)
          }
          const validPositions: ChatOverlayPosition[] = ["bottom-left", "bottom-right", "top-left", "top-right"]
          if (typeof msg.chatOverlayPosition === "string" && validPositions.includes(msg.chatOverlayPosition as ChatOverlayPosition)) {
            setChatOverlayPosition(msg.chatOverlayPosition as ChatOverlayPosition)
          }
          return
        }

        // ROOM_EVENT — relayed from host's RoomEventRelay component
        if (msg.type === "ROOM_EVENT" && msg.event && typeof msg.event === "object") {
          handleRoomEvent(msg.event as Record<string, unknown>)
        }
      } catch { /* ignore malformed data */ }
    }

    room.on(RoomEvent.DataReceived, handler)
    return () => { room.off(RoomEvent.DataReceived, handler) }
  }, [room, addMessage])

  const handleLeave = async () => {
    try {
      await fetch(`/api/rooms/${roomCode}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, identity: localParticipant.identity }),
      })
    } catch { /* best-effort */ }
    window.location.href = "/studio-ended"
  }

  // ── Track sets ─────────────────────────────────────────────────────────────
  const { stageTracks, screenshareTracks, cameraTracks } = useMemo(() => {
    const allTracks = tracks.filter(
      (t) => t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare
    )
    const screenshare = allTracks.filter((t) => t.source === Track.Source.ScreenShare)
    const camera = allTracks.filter((t) => t.source === Track.Source.Camera)
    return { stageTracks: allTracks, screenshareTracks: screenshare, cameraTracks: camera }
  }, [tracks])

  // Determine pinned track
  const pinnedTrack =
    pinnedParticipantId != null
      ? stageTracks.find((t) => t.participant.identity === pinnedParticipantId) ?? null
      : null
  const primaryTrack = pinnedTrack ?? stageTracks[0]
  const sidebarTracks = stageTracks.filter((t) => t !== primaryTrack)

  const renderTile = (trackRef: (typeof stageTracks)[number]) => (
    <VideoTile
      key={`${trackRef.participant.identity}-${trackRef.source}`}
      trackRef={trackRef}
      isVisible={true}
      isLocal={trackRef.participant.isLocal}
      isHost={false}
    />
  )

  // ── Layout rendering — mirrors VideoGrid.tsx ───────────────────────────────
  let stageContent: React.ReactNode

  if (activeLayout === "spotlight-side-strip" && stageTracks.length > 0) {
    stageContent = (
      <div className="flex gap-2 h-full">
        <div className="flex-3 min-w-0">
          {primaryTrack && renderTile(primaryTrack)}
        </div>
        {sidebarTracks.length > 0 && (
          <div className="flex flex-col gap-2 flex-1 min-w-0 overflow-y-auto">
            {sidebarTracks.map((t) => renderTile(t))}
          </div>
        )}
      </div>
    )
  } else if (activeLayout === "screen-with-strip") {
    const hasScreenshare = screenshareTracks.length > 0
    stageContent = (
      <div className="flex flex-col gap-2 h-full">
        <div className="flex-3 min-h-0">
          {hasScreenshare ? (
            <div className="flex gap-2 h-full">
              {screenshareTracks.map((t) => renderTile(t))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-600 text-sm">No screenshare active</p>
            </div>
          )}
        </div>
        {cameraTracks.length > 0 && (
          <div className="flex-1 flex gap-2 min-h-0">
            {cameraTracks.map((t) => renderTile(t))}
          </div>
        )}
      </div>
    )
  } else if (activeLayout === "screen-presenter-pip") {
    stageContent =
      screenshareTracks.length > 0 ? (
        <div className="flex gap-2 h-full">
          {screenshareTracks.map((t) => renderTile(t))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-600 text-sm">No screenshare active</p>
        </div>
      )
  } else if (activeLayout === "solo") {
    stageContent = primaryTrack ? (
      renderTile(primaryTrack)
    ) : (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600 text-sm">No participant selected</p>
      </div>
    )
  } else {
    // "four-grid" — default equal grid
    stageContent =
      stageTracks.length > 0 ? (
        <div className={`grid ${gridCols(stageTracks.length)} gap-2 h-full content-center`}>
          {stageTracks.map((t) => renderTile(t))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-600 text-sm">Waiting for video…</p>
        </div>
      )
  }

  return (
    <div className="flex flex-col h-dvh bg-[#0d0d0d] overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex-none h-12 flex items-center px-3 sm:px-4 bg-[#080808] border-b border-white/6 gap-2">
        <div className="flex items-center gap-1.5 text-white font-bold text-sm shrink-0">
          <Zap className="w-4 h-4 text-indigo-400" />
          <span className="hidden xs:inline">Zerocast</span>
        </div>
        <div className="h-4 w-px bg-white/10 shrink-0" />
        <span className="font-mono text-[11px] text-gray-500 tracking-widest uppercase shrink-0">
          {roomCode}
        </span>
        {/* Copy room link */}
        <CopyLinkButton roomCode={roomCode} />
        {/* Participant count + name */}
        <span className="text-xs text-gray-600 hidden md:inline truncate">
          {participants.length} in room · {displayName}
        </span>
        {/* Network quality */}
        <GuestNetworkQualityIndicator />

        {/* Right-side header controls */}
        <div className="ml-auto flex items-center gap-1">
          {/* Backstage toggle — mobile only (desktop panel is always shown) */}
          <button
            type="button"
            className="lg:hidden relative p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/6 transition-colors"
            onClick={() => setBackstageOpen((o) => !o)}
            aria-label="Toggle participants"
          >
            <Users className="w-4 h-4" />
            <span className="absolute top-0.5 right-0.5 min-w-[12px] h-[12px] flex items-center justify-center bg-indigo-600 text-white text-[8px] font-bold rounded-full px-0.5 leading-none">
              {participants.length}
            </span>
          </button>

          {/* Chat toggle: always on mobile; on desktop only when collapsed */}
          <button
            type="button"
            className={[
              "relative p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/6 transition-colors",
              chatCollapsed ? "flex" : "flex lg:hidden",
            ].join(" ")}
            onClick={() => {
              if (chatCollapsed) {
                setChatCollapsed(false)
                setUnreadCount(0)
              } else {
                setChatOpen((o) => {
                  if (!o) setUnreadCount(0)
                  return !o
                })
              }
            }}
            aria-label="Toggle chat"
          >
            {(chatOpen && !chatCollapsed) ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] flex items-center justify-center bg-red-500 text-white text-[8px] font-bold rounded-full px-0.5 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Video stage */}
        <div
          className="flex-1 min-h-0 p-2 sm:p-3 min-w-0 relative"
          style={{ backgroundColor: stageBackground }}
        >
          {stageContent}
          <TextOverlayRenderer overlays={textOverlays} />
          {chatOverlayEnabled && <ChatOverlay position={chatOverlayPosition} />}
          {/* Off-stage coaching — render when host has explicitly limited
              the stage and this guest is not on it. Empty list means "everyone
              on stage" so the banner stays hidden. */}
          {onScreenParticipantIds.length > 0 &&
            !onScreenParticipantIds.includes(localParticipant.identity) && (
              <div
                role="status"
                aria-live="polite"
                className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-20 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300"
              >
                <div className="flex items-center gap-2 bg-indigo-500/15 border border-indigo-400/30 text-indigo-100 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm shadow-lg">
                  <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400" />
                  </span>
                  <span>You&apos;re ready — host will bring you on stage shortly.</span>
                </div>
              </div>
            )}
          <GuestConnectionMonitor wasKicked={wasKickedInternalRef.current} />
        </div>

        {/* Desktop: Backstage sidebar — always-visible, left of chat panel */}
        <div className="hidden lg:flex flex-col w-48 border-l border-white/6 bg-[#0d0d0d]">
          <BackstagePanel
            participants={participants}
            localIdentity={localParticipant.identity}
          />
        </div>

        {/* Desktop: Chat sidebar — collapsible */}
        <div
          className={[
            "flex-col border-l border-white/6 bg-[#0d0d0d] transition-all duration-200",
            chatCollapsed ? "lg:hidden" : "lg:flex lg:w-72",
            chatOpen
              ? "flex absolute right-0 top-0 bottom-0 w-full sm:w-80 z-30 shadow-2xl"
              : "hidden",
          ].join(" ")}
        >
          <ChatPanel
            roomCode={roomCode}
            isHost={false}
            displayName={displayName}
            connectedPlatforms={[]}
            onGuestSend={handleGuestSend}
            onCollapse={() => {
              setChatCollapsed(true)
              setChatOpen(false)
              setUnreadCount(0)
            }}
            collapsed={chatCollapsed}
          />
        </div>

        {/* Floating chat badge — desktop, shown when chat sidebar is collapsed */}
        {chatCollapsed && (
          <button
            type="button"
            onClick={() => {
              setChatCollapsed(false)
              setUnreadCount(0)
            }}
            className="hidden lg:flex absolute top-3 right-3 z-40 items-center justify-center w-10 h-10 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-lg transition-all duration-200"
            aria-label="Open chat"
            title="Open chat"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Mobile: Backstage overlay */}
        {backstageOpen && (
          <div className="lg:hidden absolute inset-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-sm">
            <BackstagePanel
              participants={participants}
              localIdentity={localParticipant.identity}
              onClose={() => setBackstageOpen(false)}
            />
          </div>
        )}
      </div>

      {/* ── Guest controls bar ─────────────────────────────────────────────── */}
      <div className="flex-none flex items-center justify-between px-3 sm:px-4 py-2 bg-[#080808] border-t border-white/6 gap-2">
        <div className="flex items-center gap-1.5">
          <GuestTrackButton
            source={Track.Source.Microphone}
            onIcon={<Mic className="w-5 h-5" />}
            offIcon={<MicOff className="w-5 h-5" />}
            onLabel="Mic"
            offLabel="Muted"
          />
          {/* Live audio level */}
          <LocalAudioLevel barCount={5} />
          <GuestTrackButton
            source={Track.Source.Camera}
            onIcon={<Video className="w-5 h-5" />}
            offIcon={<VideoOff className="w-5 h-5" />}
            onLabel="Camera"
            offLabel="Cam off"
          />
          <ScreenShareButton />
        </div>

        {/* Device selectors — visible on all viewports so mobile guests
            can swap camera mid-call (DeviceSelector itself hides any picker
            with fewer than 2 devices). */}
        <div className="flex items-center">
          <DeviceSelector />
        </div>

        <button
          type="button"
          onClick={handleLeave}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium min-w-[52px] bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all select-none"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden xs:inline">Leave</span>
        </button>
      </div>
    </div>
  )
}
