"use client"

import { useEffect, useRef, useState } from "react"

import {
  AlertTriangle,
  Bot,
  Loader2,
  LogOut,
  LayoutGrid,
  Link,
  MessageSquare,
  MoreHorizontal,
  Radio,
  Settings,
  Sparkles,
  Type,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useStudioStore } from "@/store/studio"

import DeviceSelector from "./DeviceSelector"
import GoLivePanel from "./GoLivePanel"
import InviteLink from "./InviteLink"
import LayoutSelector from "./LayoutSelector"
import TextOverlayPanel from "./TextOverlayPanel"
import type { ChatOverlayPosition } from "@/store/studio"

// ── Styled checkbox row (reused from old ControlBar) ──────────────────────

interface CheckRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange?: (v: boolean) => void
}

function CheckRow({ id, label, description, checked, disabled = false, onChange }: CheckRowProps) {
  return (
    <label
      htmlFor={id}
      className={[
        "flex items-start gap-3 rounded-lg border p-3 transition-colors select-none",
        disabled
          ? "border-white/6 opacity-50 cursor-not-allowed"
          : "border-white/6 hover:border-white/12 cursor-pointer",
      ].join(" ")}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/20 bg-white/6 accent-red-500 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-100">{label}</span>
        <span className="text-xs text-gray-500">{description}</span>
      </div>
    </label>
  )
}

// ── Tooltip wrapper ────────────────────────────────────────────────────────

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 border border-white/10 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </div>
    </div>
  )
}

// ── Icon button ────────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  children,
  className = "",
}: {
  active?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center justify-center w-8 h-8 rounded-lg transition-all text-sm select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]",
        active
          ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40"
          : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  )
}

// ── Chat overlay position picker ───────────────────────────────────────────

const CHAT_POSITIONS: { label: string; value: ChatOverlayPosition }[] = [
  { label: "Bottom Left", value: "bottom-left" },
  { label: "Bottom Right", value: "bottom-right" },
  { label: "Top Left", value: "top-left" },
  { label: "Top Right", value: "top-right" },
]

// ── Props ──────────────────────────────────────────────────────────────────

interface TopToolbarProps {
  roomCode: string
  connectedPlatforms?: { platform: string; channelName: string }[]
  streamTitle?: string
  streamDescription?: string
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TopToolbar({
  roomCode,
  connectedPlatforms = [],
  streamTitle,
  streamDescription,
}: TopToolbarProps) {
  const router = useRouter()

  const {
    isLive, streamPlatforms, textOverlays, chatOverlayEnabled, chatOverlayPosition,
    setChatOverlayEnabled, setChatOverlayPosition,
    autoLayoutEnabled, setAutoLayoutEnabled,
    aiChatEnabled, aiChatContext, aiChatDelay, aiChatReadAloud,
    setAIChatEnabled, setAIChatContext, setAIChatDelay, setAIChatReadAloud,
  } = useStudioStore()

  // Panel open states
  const [textOpen, setTextOpen] = useState(false)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const [stopStreams, setStopStreams] = useState(true)
  const [kickParticipants, setKickParticipants] = useState(true)

  const textPanelRef = useRef<HTMLDivElement>(null)
  const layoutPanelRef = useRef<HTMLDivElement>(null)
  const invitePanelRef = useRef<HTMLDivElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const aiPanelRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const visibleOverlayCount = textOverlays.filter((o) => o.visible).length

  // Close all panels when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (textPanelRef.current && !textPanelRef.current.contains(target)) setTextOpen(false)
      if (layoutPanelRef.current && !layoutPanelRef.current.contains(target)) setLayoutOpen(false)
      if (invitePanelRef.current && !invitePanelRef.current.contains(target)) setInviteOpen(false)
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(target)) setSettingsOpen(false)
      if (aiPanelRef.current && !aiPanelRef.current.contains(target)) setAiOpen(false)
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) setMobileMenuOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleEnd = async () => {
    setEnding(true)
    try {
      await fetch(`/api/rooms/${roomCode}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopStreams: isLive ? stopStreams : false, kickParticipants }),
      })
      router.push(`/session-summary/${roomCode}`)
    } finally {
      setEnding(false)
      setEndOpen(false)
    }
  }

  const platformLabel = streamPlatforms.length > 0
    ? streamPlatforms.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(", ")
    : null

  // ── Toolbar items list (shared between desktop row and mobile menu) ────────

  const toolbarItems = (
    <>
      {/* Text Overlays */}
      <div className="relative" ref={textOpen ? textPanelRef : undefined}>
        <Tip label="Text Overlays">
          <ToolBtn active={textOpen} onClick={() => { setTextOpen((o) => !o); setLayoutOpen(false); setInviteOpen(false); setSettingsOpen(false) }}>
            <span className="relative">
              <Type className="w-4 h-4" />
              {visibleOverlayCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[12px] h-[12px] flex items-center justify-center bg-violet-500 text-white text-[7px] font-bold rounded-full px-0.5 leading-none">
                  {visibleOverlayCount}
                </span>
              )}
            </span>
          </ToolBtn>
        </Tip>
        {textOpen && (
          <div ref={textPanelRef} className="absolute top-full mt-2 left-0 z-50">
            <TextOverlayPanel />
          </div>
        )}
      </div>

      {/* Layout */}
      <div className="relative" ref={layoutOpen ? layoutPanelRef : undefined}>
        <Tip label="Layout">
          <ToolBtn active={layoutOpen} onClick={() => { setLayoutOpen((o) => !o); setTextOpen(false); setInviteOpen(false); setSettingsOpen(false) }}>
            <LayoutGrid className="w-4 h-4" />
          </ToolBtn>
        </Tip>
        {layoutOpen && (
          <div ref={layoutPanelRef} className="absolute top-full mt-2 left-0 z-50 bg-[#111111] border border-white/10 rounded-xl shadow-2xl p-3 min-w-[200px]">
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Layout</p>
            <LayoutSelector />
            {/* Auto Layout toggle */}
            <div className="mt-3 pt-2.5 border-t border-white/8">
              <button
                type="button"
                onClick={() => setAutoLayoutEnabled(!autoLayoutEnabled)}
                className={[
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-xs font-medium select-none",
                  autoLayoutEnabled
                    ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
                    : "bg-white/4 text-gray-400 hover:bg-white/8 hover:text-white",
                ].join(" ")}
                title={autoLayoutEnabled ? "Auto Layout is ON — click to disable" : "Enable Auto Layout"}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left">Auto Layout</span>
                <span className={[
                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                  autoLayoutEnabled
                    ? "bg-violet-500/30 text-violet-300"
                    : "bg-white/8 text-gray-600",
                ].join(" ")}>
                  {autoLayoutEnabled ? "ON" : "OFF"}
                </span>
              </button>
              <p className="text-[9px] text-gray-600 mt-1.5 px-1 leading-snug">
                {autoLayoutEnabled
                  ? "Switching layouts automatically. Click any layout to override."
                  : "Automatically switch layout based on who is speaking or sharing."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Copy Link / Invite */}
      <div className="relative" ref={inviteOpen ? invitePanelRef : undefined}>
        <Tip label="Invite Link">
          <ToolBtn active={inviteOpen} onClick={() => { setInviteOpen((o) => !o); setTextOpen(false); setLayoutOpen(false); setSettingsOpen(false) }}>
            <Link className="w-4 h-4" />
          </ToolBtn>
        </Tip>
        {inviteOpen && (
          <div ref={invitePanelRef} className="absolute top-full mt-2 left-0 z-50 bg-[#111111] border border-white/10 rounded-xl shadow-2xl p-3">
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Invite</p>
            <InviteLink roomCode={roomCode} />
          </div>
        )}
      </div>

      {/* Chat Overlay toggle */}
      <Tip label={chatOverlayEnabled ? "Chat overlay on" : "Chat overlay off"}>
        <ToolBtn active={chatOverlayEnabled} onClick={() => setChatOverlayEnabled(!chatOverlayEnabled)}>
          <MessageSquare className="w-4 h-4" />
        </ToolBtn>
      </Tip>

      {/* AI Chat Assistant */}
      <div className="relative" ref={aiOpen ? aiPanelRef : undefined}>
        <Tip label={aiChatEnabled ? "AI Chat: On" : "AI Chat Assistant"}>
          <ToolBtn
            active={aiOpen || aiChatEnabled}
            onClick={() => { setAiOpen((o) => !o); setTextOpen(false); setLayoutOpen(false); setInviteOpen(false); setSettingsOpen(false) }}
            className={aiChatEnabled ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40" : ""}
          >
            <span className="relative">
              <Bot className="w-4 h-4" />
              {aiChatEnabled && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-400 rounded-full border border-[#080808]" />
              )}
            </span>
          </ToolBtn>
        </Tip>
        {aiOpen && (
          <div ref={aiPanelRef} className="absolute top-full mt-2 left-0 z-50 bg-[#111111] border border-white/10 rounded-xl shadow-2xl p-4 w-72 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-sm font-semibold text-white">AI Chat Assistant</span>
              <span className={[
                "ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                aiChatEnabled ? "bg-indigo-500/30 text-indigo-300" : "bg-white/8 text-gray-600",
              ].join(" ")}>
                {aiChatEnabled ? "ON" : "OFF"}
              </span>
            </div>

            {/* Enabled toggle */}
            <div className="flex items-center gap-3 select-none">
              <button
                type="button"
                role="switch"
                aria-checked={aiChatEnabled}
                aria-label="AI chat assistant"
                onClick={() => setAIChatEnabled(!aiChatEnabled)}
                className={[
                  "relative w-9 h-5 rounded-full transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]",
                  aiChatEnabled ? "bg-indigo-500" : "bg-white/15",
                ].join(" ")}
              >
                <span className={[
                  "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  aiChatEnabled ? "translate-x-4" : "translate-x-0",
                ].join(" ")} />
              </button>
              <span className="text-sm text-gray-300">
                {aiChatEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {/* Context textarea */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">
                Context for the AI
              </label>
              <textarea
                rows={3}
                value={aiChatContext}
                onChange={(e) => setAIChatContext(e.target.value)}
                placeholder='e.g. "This is a Minecraft survival tutorial stream"'
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-lg text-xs text-gray-200 placeholder-gray-600 px-2.5 py-2 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {/* Response delay */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">
                Response delay: <span className="text-gray-300 font-semibold">{aiChatDelay}s</span>
              </label>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={aiChatDelay}
                onChange={(e) => setAIChatDelay(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                <span>5s</span>
                <span>60s</span>
              </div>
            </div>

            {/* Read aloud toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiChatReadAloud}
                onChange={(e) => setAIChatReadAloud(e.target.checked)}
                className="h-3.5 w-3.5 rounded border border-white/20 bg-white/6 accent-indigo-500"
              />
              <span className="text-xs text-gray-400">Read AI responses aloud</span>
            </label>

            {/* Info footer */}
            <p className="text-[10px] text-gray-600 leading-snug border-t border-white/6 pt-3">
              AI answers viewer questions when you haven&apos;t responded within {aiChatDelay}s.
              Powered by Gemini Flash — free tier (15 req/min).
            </p>
          </div>
        )}
      </div>

      {/* Go Live */}
      <GoLivePanel
        roomCode={roomCode}
        connectedPlatforms={connectedPlatforms}
        streamTitle={streamTitle}
        streamDescription={streamDescription}
      />

      {/* Settings (device selector + chat position) */}
      <div className="relative" ref={settingsOpen ? settingsPanelRef : undefined}>
        <Tip label="Settings">
          <ToolBtn active={settingsOpen} onClick={() => { setSettingsOpen((o) => !o); setTextOpen(false); setLayoutOpen(false); setInviteOpen(false) }}>
            <Settings className="w-4 h-4" />
          </ToolBtn>
        </Tip>
        {settingsOpen && (
          <div ref={settingsPanelRef} className="absolute top-full mt-2 right-0 z-50 bg-[#111111] border border-white/10 rounded-xl shadow-2xl p-4 w-64 space-y-4">
            <div>
              <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Devices</p>
              <DeviceSelector />
            </div>
            {chatOverlayEnabled && (
              <div>
                <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Chat Overlay Position</p>
                <div className="grid grid-cols-2 gap-1">
                  {CHAT_POSITIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setChatOverlayPosition(p.value)}
                      className={[
                        "px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border",
                        chatOverlayPosition === p.value
                          ? "bg-violet-500/20 text-violet-300 border-violet-500/40"
                          : "bg-white/4 text-gray-500 border-white/8 hover:text-white",
                      ].join(" ")}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* End Session */}
      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogTrigger
          render={
            <Tip label="End Session">
              <ToolBtn className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300">
                <LogOut className="w-4 h-4" />
              </ToolBtn>
            </Tip>
          }
        />

        <DialogContent
          showCloseButton={!ending}
          className="bg-[#0d0d0d] border border-white/6 text-white sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white">
              End Studio Session
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Choose what happens when you end this studio.
            </DialogDescription>
          </DialogHeader>

          {isLive && platformLabel && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
              <Radio className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Currently streaming to <span className="font-semibold">{platformLabel}</span>. Ending will stop all active streams.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <CheckRow
              id="tt-stop-streams"
              label="End live stream on all platforms"
              description={isLive ? "Stops the RTMP egress to all connected platforms." : "No active stream to stop."}
              checked={isLive ? stopStreams : false}
              disabled={!isLive}
              onChange={setStopStreams}
            />
            <CheckRow
              id="tt-kick-participants"
              label="Remove all participants"
              description="Disconnects guests from the LiveKit room before closing."
              checked={kickParticipants}
              onChange={setKickParticipants}
            />
            <CheckRow
              id="tt-end-session"
              label="End studio session"
              description="Always required — marks the room as ended and redirects you to the summary."
              checked
              disabled
            />
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-600" />
            <span>This action cannot be undone. The studio will be permanently closed.</span>
          </div>

          <DialogFooter className="bg-transparent border-t border-white/6 gap-2">
            <button
              type="button"
              onClick={() => setEndOpen(false)}
              disabled={ending}
              className="flex-1 sm:flex-none h-8 px-4 rounded-lg border border-white/10 bg-white/4 text-sm text-gray-300 hover:bg-white/8 hover:text-white transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <Button
              variant="destructive"
              onClick={handleEnd}
              disabled={ending}
              className="flex-1 sm:flex-none gap-2 bg-red-600/80 hover:bg-red-600 text-white border-red-500/30"
            >
              {ending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Ending…
                </>
              ) : (
                "End Studio"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  return (
    <div className="flex-none flex items-center justify-between px-3 py-1.5 bg-[#080808] border-b border-white/6 gap-2 z-20">
      {/* Desktop: show all buttons in a row */}
      <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
        {toolbarItems}
      </div>

      {/* Mobile: collapse to a "..." button */}
      <div className="sm:hidden relative" ref={mobileMenuRef}>
        <ToolBtn onClick={() => setMobileMenuOpen((o) => !o)} active={mobileMenuOpen}>
          <MoreHorizontal className="w-4 h-4" />
        </ToolBtn>
        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="absolute top-full mt-2 left-0 z-50 bg-[#111111] border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-2 min-w-[180px]"
          >
            {toolbarItems}
          </div>
        )}
      </div>
    </div>
  )
}
