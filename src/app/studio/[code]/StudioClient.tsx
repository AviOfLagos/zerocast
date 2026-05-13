"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { LiveKitRoom, RoomAudioRenderer, StartAudio, useConnectionQualityIndicator, useConnectionState, useLocalParticipant, useParticipants } from "@livekit/components-react"
import { MessageSquare, Users, Wifi, WifiOff, WifiZero, X, Zap } from "lucide-react"
import { ConnectionQuality, ConnectionState } from "livekit-client"
import { toast } from "sonner"

import ChatPanel from "@/components/chat/ChatPanel"
import { PLATFORM_COLORS } from "@/components/chat/PlatformBadge"
import AIChatController from "@/components/studio/AIChatController"
import AutoLayoutManager from "@/components/studio/AutoLayoutManager"
import ConnectionStatus from "@/components/studio/ConnectionStatus"
import ControlBar from "@/components/studio/ControlBar"
import ErrorBannerStack, { type CriticalError } from "@/components/studio/ErrorBanner"
import GuestRequestToast from "@/components/studio/GuestRequestToast"
import RoomEventRelay from "@/components/studio/RoomEventRelay"
import StreamHealthBadge from "@/components/studio/StreamHealthBadge"
import StudioCoachMarks from "@/components/studio/StudioCoachMarks"
import TopToolbar from "@/components/studio/TopToolbar"
import VideoGrid from "@/components/studio/VideoGrid"
import PlatformIcon, { PLATFORM_META } from "@/components/ui/PlatformIcon"
import useNotificationSound from "@/hooks/useNotificationSound"
import { SSEEventDataSchema } from "@/lib/schemas/sse"
import { PlatformListResponseSchema } from "@/lib/schemas/platform"
import type { SSEEventData } from "@/lib/chat/types"
import { useChatStore } from "@/store/chat"
import { useStudioStore } from "@/store/studio"

interface StudioClientProps {
  roomCode: string
  hostToken: string
  livekitUrl: string
  title?: string
  description?: string
  connectedPlatforms?: { platform: string; channelName: string }[]
}

const MAX_RECONNECT_ATTEMPTS = 5

function ConnectionMonitor() {
  const state = useConnectionState()
  const prevStateRef = useRef<ConnectionState>(ConnectionState.Connecting)
  // Reconnection attempt counter
  const attemptCountRef = useRef(0)
  const [attemptCount, setAttemptCount] = useState(0)
  // Elapsed seconds since disconnect began
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Debounce: block duplicate reconnect cycles
  const reconnectInProgressRef = useRef(false)

  useEffect(() => {
    const prev = prevStateRef.current

    if (state === ConnectionState.Reconnecting && prev !== ConnectionState.Reconnecting) {
      // Start a new cycle only if one isn't already running
      if (!reconnectInProgressRef.current) {
        reconnectInProgressRef.current = true
        attemptCountRef.current += 1
        setAttemptCount(attemptCountRef.current)
        setElapsedSecs(0)
        console.debug(`[ConnectionMonitor] Reconnect attempt #${attemptCountRef.current}`)
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
      console.debug("[ConnectionMonitor] Reconnected successfully")
      toast.success("Reconnected", {
        description: "Connection to the studio has been restored.",
        duration: 3000,
      })
    }

    if (state === ConnectionState.Disconnected && prev !== ConnectionState.Disconnected) {
      reconnectInProgressRef.current = false
      if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
      console.debug("[ConnectionMonitor] Permanently disconnected")
    }

    prevStateRef.current = state
  }, [state])

  // Clean up elapsed timer on unmount
  useEffect(() => () => { if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current) }, [])

  if (state === ConnectionState.Connecting) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-50 pointer-events-none">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-white text-sm">Connecting to studio...</p>
        </div>
      </div>
    )
  }

  if (state === ConnectionState.Reconnecting) {
    const exhausted = attemptCount > MAX_RECONNECT_ATTEMPTS
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-50">
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
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
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
      <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
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

function NetworkQualityIndicator() {
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
    // Lost or Unknown
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

function ParticipantCount() {
  const participants = useParticipants()
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Users className="w-3 h-3" />
      {participants.length}
    </span>
  )
}

function LiveBadge() {
  const isLive = useStudioStore((s) => s.isLive)
  if (!isLive) return null

  return (
    <span className="inline-flex items-center gap-1.5 bg-red-500/15 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
      </span>
      LIVE
    </span>
  )
}

// Broadcasts layout changes to all guests via LiveKit data messages.
// Must be rendered inside a <LiveKitRoom> so localParticipant is available.
function LayoutBroadcaster() {
  const { localParticipant } = useLocalParticipant()
  const activeLayout = useStudioStore((s) => s.activeLayout)
  const pinnedParticipantId = useStudioStore((s) => s.pinnedParticipantId)
  const textOverlays = useStudioStore((s) => s.textOverlays)
  const stageBackground = useStudioStore((s) => s.stageBackground)
  const chatOverlayEnabled = useStudioStore((s) => s.chatOverlayEnabled)
  const chatOverlayPosition = useStudioStore((s) => s.chatOverlayPosition)
  const hasBroadcastedRef = useRef(false)

  useEffect(() => {
    if (!localParticipant) return
    // Broadcast on every change (and once on first render for late-joining guests)
    const payload: Record<string, unknown> = {
      type: "LAYOUT_CHANGE",
      layout: activeLayout,
      pinnedParticipantId: pinnedParticipantId ?? null,
      textOverlays,
      stageBackground,
      chatOverlayEnabled,
      chatOverlayPosition,
    }
    const encoder = new TextEncoder()
    localParticipant
      .publishData(encoder.encode(JSON.stringify(payload)), { reliable: true })
      .catch(() => {/* non-critical -- guest will fall back to default layout */})
    hasBroadcastedRef.current = true
  }, [localParticipant, activeLayout, pinnedParticipantId, textOverlays, stageBackground, chatOverlayEnabled, chatOverlayPosition])

  return null
}

export default function StudioClient({ roomCode, hostToken, livekitUrl, title, description, connectedPlatforms: initialPlatforms }: StudioClientProps) {
  const addPendingGuest = useStudioStore((s) => s.addPendingGuest)
  const removePendingGuest = useStudioStore((s) => s.removePendingGuest)
  const hydrateFromSaved = useStudioStore((s) => s.hydrateFromSaved)
  const setLiveState = useStudioStore((s) => s.setLiveState)
  const addStreamPlatform = useStudioStore((s) => s.addStreamPlatform)
  const removeStreamPlatform = useStudioStore((s) => s.removeStreamPlatform)
  const sendToBackstage = useStudioStore((s) => s.sendToBackstage)
  const addMessage = useChatStore((s) => s.addMessage)
  const hydrateFilters = useChatStore((s) => s.hydrateFilters)
  const startedConnectors = useRef(false)
  // chatOpen: mobile overlay toggle (< lg screens)
  const [chatOpen, setChatOpen] = useState(false)
  // chatCollapsed: desktop sidebar collapse (lg+ screens)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  // unreadCount: messages received while desktop chat is collapsed
  const [unreadCount, setUnreadCount] = useState(0)
  // relayOk tracks whether RoomEventRelay is healthy (replaces sseOk)
  const [relayOk, setRelayOk] = useState(true)
  const [connectedPlatforms, setConnectedPlatforms] = useState<{ platform: string; channelName: string }[]>(initialPlatforms ?? [])
  const [criticalErrors, setCriticalErrors] = useState<CriticalError[]>([])
  const { play: playSound, requestNotificationPermission } = useNotificationSound()

  // F-11: Hydrate studio state from Redis on mount
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    fetch(`/api/rooms/${roomCode}/state`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.state) {
          const s = data.state as Record<string, unknown>
          if (s.activeLayout || s.pinnedParticipantId !== undefined || s.onScreenParticipantIds) {
            hydrateFromSaved({
              activeLayout: s.activeLayout as Parameters<typeof hydrateFromSaved>[0]["activeLayout"],
              pinnedParticipantId: (s.pinnedParticipantId as string | null) ?? null,
              onScreenParticipantIds: (s.onScreenParticipantIds as string[]) ?? undefined,
            })
          }
          if (s.filters) {
            hydrateFilters(s.filters as Parameters<typeof hydrateFilters>[0])
          }
        }
      })
      .catch(() => {/* Redis unavailable -- use defaults */})
  }, [roomCode, hydrateFromSaved, hydrateFilters])

  // F-11: Debounced save of studio + chat filter state to Redis
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const unsubStudio = useStudioStore.subscribe((state) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const chatFilters = useChatStore.getState().filters
        fetch(`/api/rooms/${roomCode}/state`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activeLayout: state.activeLayout,
            pinnedParticipantId: state.pinnedParticipantId,
            onScreenParticipantIds: state.onScreenParticipantIds,
            filters: chatFilters,
          }),
        }).catch(() => {/* save failed -- non-critical */})
      }, 500)
    })

    const unsubChat = useChatStore.subscribe((state, prev) => {
      // Only save when filters change, not on every message
      if (state.filters === prev.filters) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const studioState = useStudioStore.getState()
        fetch(`/api/rooms/${roomCode}/state`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activeLayout: studioState.activeLayout,
            pinnedParticipantId: studioState.pinnedParticipantId,
            onScreenParticipantIds: studioState.onScreenParticipantIds,
            filters: state.filters,
          }),
        }).catch(() => {/* save failed -- non-critical */})
      }, 500)
    })

    return () => {
      unsubStudio()
      unsubChat()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [roomCode])

  // Refs to read chat-visibility state inside event handler without stale closure
  const chatCollapsedRef = useRef(chatCollapsed)
  const chatOpenRef = useRef(chatOpen)
  useEffect(() => { chatCollapsedRef.current = chatCollapsed }, [chatCollapsed])
  useEffect(() => { chatOpenRef.current = chatOpen }, [chatOpen])

  // Event handler — called by RoomEventRelay for every new room/chat event
  const handleSSEEvent = useCallback((event: SSEEventData) => {
    switch (event.type) {
      case "GUEST_REQUEST":
        addPendingGuest({ guestId: event.data.guestId, name: event.data.name })
        playSound("guest-join", {
          showNotification: {
            title: "Guest wants to join",
            body: `${event.data.name} is waiting to be admitted.`,
          },
        })
        break
      case "GUEST_ADMITTED":
      case "GUEST_DENIED":
        removePendingGuest(event.data.guestId)
        break
      case "GUEST_LEFT": {
        // Clean stale participant from on-screen list
        sendToBackstage(event.data.participantId)
        const guestLabel = event.data.name ?? event.data.participantId
        if (event.data.reason === "kicked") {
          toast.info(`${guestLabel} was removed from the studio`)
        } else {
          toast.info(`${guestLabel} left the studio`)
        }
        break
      }
      case "CHAT_MESSAGE":
        addMessage(event.data)
        // Count unread when chat isn't visible — desktop collapsed OR mobile closed
        // (lg+ uses chatCollapsed; <lg uses chatOpen).
        if (typeof window !== "undefined") {
          const isLg = window.matchMedia("(min-width: 1024px)").matches
          const chatVisible = isLg ? !chatCollapsedRef.current : chatOpenRef.current
          if (!chatVisible) setUnreadCount((n) => n + 1)
        }
        break
      case "CHAT_CONNECTOR_STATUS":
        console.info(`[ConnectorStatus] ${event.data.platform}: ${event.data.status}${event.data.error ? ` -- ${event.data.error}` : ""}`)
        break
      case "CONNECTION_ERROR":
        setRelayOk(false)
        break
      case "STUDIO_ENDED":
        window.location.href = "/dashboard"
        break
      // Streaming SSE events
      case "STREAM_STARTED":
        setLiveState(true, event.data.egressId, event.data.platforms, new Date())
        playSound("stream-live")
        toast.success("Stream started", { description: `Now live on ${event.data.platforms.length} platform(s).` })
        break
      case "STREAM_STOPPED":
        setLiveState(false)
        toast.info("Stream ended")
        break
      case "STREAM_DESTINATION_CHANGED":
        if (event.data.action === "add") {
          addStreamPlatform(event.data.platform)
          toast.success(`Added ${event.data.platform} to stream`)
        } else {
          removeStreamPlatform(event.data.platform)
          toast.info(`Removed ${event.data.platform} from stream`)
        }
        break
      case "STREAM_ERROR":
        playSound("stream-error", {
          showNotification: {
            title: "Stream error",
            body: `${event.data.platform ? `[${event.data.platform}] ` : ""}${event.data.error}`,
          },
        })
        setCriticalErrors((prev) => [
          ...prev,
          {
            id: `stream-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: event.data.platform ? `Stream error on ${event.data.platform}` : "Stream error",
            detail: event.data.error,
          },
        ])
        break
    }
  }, [addPendingGuest, removePendingGuest, addMessage, setLiveState, addStreamPlatform, removeStreamPlatform, sendToBackstage, playSound])

  // Ref-based callback for stable handler identity (no dependency churn in RoomEventRelay)
  const handleSSEEventRef = useRef<(event: SSEEventData) => void>(handleSSEEvent)
  handleSSEEventRef.current = handleSSEEvent

  // RoomEventRelay callback — called for every event/chat message the relay picks up
  const handleRelayEvent = useCallback((raw: Record<string, unknown>) => {
    // Recover relay health on successful event delivery
    setRelayOk(true)

    const parsed = SSEEventDataSchema.safeParse(raw)
    if (parsed.success) handleSSEEventRef.current(parsed.data)
  }, [])

  // Only fetch platforms client-side if not provided server-side
  useEffect(() => {
    if (initialPlatforms && initialPlatforms.length > 0) return
    fetch(`/api/rooms/${roomCode}/platforms`)
      .then((r) => r.json())
      .then((data) => {
        const parsed = PlatformListResponseSchema.safeParse(data)
        if (parsed.success) setConnectedPlatforms(parsed.data.platforms)
        else if (Array.isArray(data.platforms)) setConnectedPlatforms(data.platforms)
      })
      .catch(() => {/* silently ignore -- indicator is non-critical */})
  }, [roomCode, initialPlatforms])

  // Start chat connectors once (chat messages flow Redis → RoomEventRelay → data channel)
  useEffect(() => {
    if (!startedConnectors.current) {
      startedConnectors.current = true
      fetch(`/api/rooms/${roomCode}/chat/connect`, { method: "POST" }).catch(console.error)
    }
  }, [roomCode])

  // Ask for desktop notification permission once — best-effort; some browsers
  // require a click before granting, in which case this no-ops and we fall
  // back to the audible tones alone.
  const notifPermRequestedRef = useRef(false)
  useEffect(() => {
    if (notifPermRequestedRef.current) return
    notifPermRequestedRef.current = true
    void requestNotificationPermission()
  }, [requestNotificationPermission])

  // G17 -- guard against undefined livekitUrl (after all hooks)
  if (!livekitUrl) {
    return (
      <div className="flex items-center justify-center h-dvh bg-studio-bg">
        <div className="text-center px-6">
          <p className="text-white font-semibold mb-2">Configuration error</p>
          <p className="text-gray-400 text-sm">LiveKit URL is not configured. Contact support.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-studio-bg overflow-hidden">
      {/* Fixed overlay toasts -- pass hostToken for demo/direct-access auth */}
      <GuestRequestToast roomCode={roomCode} hostToken={hostToken} />

      {/* Header */}
      <header className="flex-none h-12 flex items-center justify-between px-4 bg-studio-bg-deep border-b border-white/6 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-white font-bold text-sm">
            <Zap className="w-4 h-4 text-indigo-400" />
            Zerocast
          </div>
          <div className="h-4 w-px bg-white/10" />
          {title ? (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white leading-tight">{title}</span>
              <span className="font-mono text-[9px] text-gray-600 tracking-widest uppercase">{roomCode}</span>
            </div>
          ) : (
            <span className="font-mono text-[11px] text-gray-500 tracking-widest uppercase">{roomCode}</span>
          )}
          {/* LIVE badge in header when streaming (compact pulse) */}
          <LiveBadge />
          {connectedPlatforms.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 ml-1" aria-label="Connected platforms">
              {connectedPlatforms.slice(0, 3).map((p) => (
                <span
                  key={p.platform}
                  title={`${PLATFORM_META[p.platform]?.label ?? p.platform}: ${p.channelName}`}
                  className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full pl-1.5 pr-2 py-0.5"
                  style={{ borderColor: `${(PLATFORM_COLORS as Record<string, string>)[p.platform] ?? "#6b7280"}33` }}
                >
                  <PlatformIcon platform={p.platform} size={10} />
                  <span className="text-[10px] font-medium text-gray-200">
                    {PLATFORM_META[p.platform]?.label ?? p.platform}
                  </span>
                </span>
              ))}
              {connectedPlatforms.length > 3 && (
                <span
                  title={connectedPlatforms.slice(3).map((p) => p.platform).join(", ")}
                  className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-full"
                >
                  +{connectedPlatforms.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Mobile chat toggle (< lg) */}
        <button
          type="button"
          className="lg:hidden relative p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/6 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg-deep"
          onClick={() => {
            setChatOpen((o) => {
              if (!o) setUnreadCount(0)
              return !o
            })
          }}
          aria-label={chatOpen ? "Close chat" : `Open chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          {chatOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
          {!chatOpen && unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* LiveKit room wraps everything so ControlBar has access to context */}
      <LiveKitRoom
        token={hostToken}
        serverUrl={livekitUrl}
        connect={true}
        video={true}
        audio={true}
        options={{
          audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true, echoCancellation: true },
          videoCaptureDefaults: { resolution: { width: 1280, height: 720, frameRate: 30 } },
          publishDefaults: { simulcast: true },
          // Reduce quality on poor network instead of hard-disconnecting
          adaptiveStream: true,
          // Only send video layers receivers actually need
          dynacast: true,
          // Survive tab blur / mobile sleep without killing the connection
          disconnectOnPageLeave: false,
          // Exponential back-off: 1 s, 2 s, 4 s, 8 s, 8 s — give up after 5 attempts
          reconnectPolicy: {
            nextRetryDelayInMs: (context) => {
              if (context.retryCount >= MAX_RECONNECT_ATTEMPTS) return null
              return Math.min(1000 * Math.pow(2, context.retryCount), 8000)
            },
          },
        }}
        className="flex flex-1 overflow-hidden"
      >
        {/* Render remote participants' audio */}
        <RoomAudioRenderer />
        {/* Broadcast layout changes to all guests via LiveKit data messages */}
        <LayoutBroadcaster />
        {/* Auto Layout Manager — host-only, drives activeLayout based on activity */}
        <AutoLayoutManager />
        {/* Relay Redis events + chat to all participants via LiveKit data channel */}
        <RoomEventRelay roomCode={roomCode} onEvent={handleRelayEvent} />
        {/* AI Chat Controller — host-only, monitors viewer questions and auto-responds */}
        <AIChatController roomCode={roomCode} />
        {/* Fix: Browser autoplay policy blocks audio until user gesture on this page.
            StartAudio shows a button only when audio is blocked, auto-hides otherwise. */}
        <StartAudio label="Click to enable audio" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium shadow-lg transition-all animate-pulse" />
        {/* Stage: video + controls — always fills available width, never obscured */}
        <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Top toolbar — panels, go live, layout, text, end session */}
          <TopToolbar
            roomCode={roomCode}
            connectedPlatforms={connectedPlatforms}
            streamTitle={title}
            streamDescription={description}
          />
          {/* Participant count + network quality (inside LiveKitRoom context) */}
          <div className="absolute top-10 right-2 z-10 flex items-center gap-2">
            <StreamHealthBadge />
            <NetworkQualityIndicator />
            <ParticipantCount />
          </div>
          {/* F-12: Connection status indicator inside LiveKitRoom context */}
          <ConnectionStatus />
          {/* Persistent critical errors (stream egress crash, RTMP reject, etc.) */}
          <ErrorBannerStack
            errors={criticalErrors}
            onDismiss={(id) => setCriticalErrors((prev) => prev.filter((e) => e.id !== id))}
          />
          {/* Progressive coach marks — first-run host hints, host-only */}
          <StudioCoachMarks connectedPlatforms={connectedPlatforms} isHost={true} />
          <div className="flex-1 overflow-hidden">
            <VideoGrid roomCode={roomCode} isHost={true} hostToken={hostToken} />
          </div>
          {/* ControlBar — media controls only (mic, cam, screen, record) */}
          <ControlBar roomCode={roomCode} />

          {/* G35 -- LiveKit connection state overlay */}
          <ConnectionMonitor />
        </div>

        {/* Mobile chat backdrop — taps close the panel */}
        {chatOpen && (
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => setChatOpen(false)}
            className="lg:hidden absolute inset-0 top-12 z-20 bg-black/40 backdrop-blur-[2px] cursor-default"
          />
        )}
        {/* Chat panel — desktop: collapsible sidebar; mobile: absolute overlay */}
        <div
          className={[
            "flex-col border-l border-white/6 bg-studio-bg transition-all duration-200",
            // Desktop lg+: visible by default, hidden when collapsed
            chatCollapsed ? "lg:hidden" : "lg:flex lg:w-72 xl:w-80",
            // Mobile: absolute overlay driven by chatOpen
            chatOpen
              ? "flex absolute right-0 top-12 bottom-0 w-full sm:w-80 z-30 shadow-2xl"
              : "hidden",
          ].join(" ")}
        >
          <ChatPanel
            roomCode={roomCode}
            isHost={true}
            connectedPlatforms={connectedPlatforms}
            onCollapse={() => {
              setChatCollapsed(true)
              setUnreadCount(0)
            }}
            collapsed={chatCollapsed}
          />
        </div>

        {/* Floating badge — desktop only, shown when chat sidebar is collapsed */}
        {chatCollapsed && (
          <button
            type="button"
            onClick={() => {
              setChatCollapsed(false)
              setUnreadCount(0)
            }}
            className="hidden lg:flex absolute top-3 right-3 z-40 items-center justify-center w-10 h-10 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg"
            aria-label={`Open chat${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
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
      </LiveKitRoom>

      {/* G13 -- event relay connection error banner */}
      {!relayOk && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-500/15 border border-red-500/20 text-red-300 text-xs px-4 py-2 rounded-full z-50">
          Connection interrupted -- events may be delayed
        </div>
      )}
    </div>
  )
}
