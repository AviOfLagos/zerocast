"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Radio, Square, ExternalLink, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"
import PlatformIcon, { PLATFORM_META } from "@/components/ui/PlatformIcon"
import { useStudioStore } from "@/store/studio"

interface PlatformStreamStatus {
  platform: string
  channelName: string
  hasStreamKey: boolean
  hasOAuthToken: boolean
}


function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":")
}

function LiveTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const update = () => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <span className="font-mono text-sm text-white tabular-nums">{formatDuration(elapsed)}</span>
  )
}

interface GoLivePanelProps {
  roomCode: string
  connectedPlatforms: { platform: string; channelName: string }[]
  streamTitle?: string
  streamDescription?: string
}

interface CustomRtmpDest {
  id: string
  name: string
  ingestUrl: string
}

export default function GoLivePanel({ roomCode, connectedPlatforms, streamTitle, streamDescription }: GoLivePanelProps) {
  const [open, setOpen] = useState(false)
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStreamStatus[]>([])
  const [customRtmpDests, setCustomRtmpDests] = useState<CustomRtmpDest[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [selectedCustomRtmp, setSelectedCustomRtmp] = useState<Set<string>>(new Set())
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const fetchedRef = useRef(false)

  const isLive = useStudioStore((s) => s.isLive)
  const streamPlatforms = useStudioStore((s) => s.streamPlatforms)
  const streamStartedAt = useStudioStore((s) => s.streamStartedAt)
  const setLiveState = useStudioStore((s) => s.setLiveState)

  // Fetch stream key statuses when panel opens
  useEffect(() => {
    if (!open || fetchedRef.current) return
    fetchedRef.current = true

    // Fetch platform stream keys + custom RTMP in parallel
    Promise.all([
      fetch("/api/platforms/stream-key").then((r) => r.json()).catch(() => ({ platforms: [] })),
      fetch("/api/platforms/custom-rtmp").then((r) => r.json()).catch(() => ({ destinations: [] })),
    ]).then(([keyData, rtmpData]) => {
      // Platform statuses
      const statuses = connectedPlatforms.map((cp) => {
        const match = (keyData.platforms ?? []).find(
          (p: { platform: string; hasStreamKey: boolean; hasOAuthToken?: boolean }) =>
            p.platform.toLowerCase() === cp.platform.toLowerCase()
        )
        return {
          platform: cp.platform,
          channelName: cp.channelName,
          hasStreamKey: match?.hasStreamKey ?? false,
          hasOAuthToken: match?.hasOAuthToken ?? false,
        }
      })
      setPlatformStatuses(statuses)
      const autoSelected = new Set(
        statuses.filter((s) => s.hasStreamKey).map((s) => s.platform)
      )
      setSelectedPlatforms(autoSelected)

      // Custom RTMP destinations
      if (rtmpData.destinations) {
        setCustomRtmpDests(rtmpData.destinations)
      }
    })
  }, [open, connectedPlatforms])

  // Reset fetch ref when dialog closes
  useEffect(() => {
    if (!open) fetchedRef.current = false
  }, [open])

  const togglePlatform = useCallback((platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(platform)) next.delete(platform)
      else next.add(platform)
      return next
    })
  }, [])

  const handleGoLive = useCallback(async () => {
    if (selectedPlatforms.size === 0) return
    setStarting(true)
    try {
      const res = await fetch(`/api/rooms/${roomCode}/stream-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: Array.from(selectedPlatforms) }),
      })
      if (res.ok) {
        const data = await res.json()
        setLiveState(true, data.egressId, Array.from(selectedPlatforms), new Date())
        toast.success("You are live!", { description: `Streaming to ${selectedPlatforms.size} platform(s).` })
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to start stream" }))
        toast.error("Failed to go live", { description: err.error })
      }
    } catch {
      toast.error("Network error", { description: "Could not reach the server." })
    } finally {
      setStarting(false)
    }
  }, [roomCode, selectedPlatforms, setLiveState])

  const handleEndStream = useCallback(async () => {
    setStopping(true)
    try {
      const res = await fetch(`/api/rooms/${roomCode}/stream-live`, { method: "DELETE" })
      if (res.ok) {
        setLiveState(false)
        toast.info("Stream ended", { description: "You are no longer live." })
      } else {
        toast.error("Failed to end stream")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setStopping(false)
    }
  }, [roomCode, setLiveState])

  const handleAddDestination = useCallback(async (platform: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/stream-live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", platform }),
      })
      if (res.ok) {
        useStudioStore.getState().addStreamPlatform(platform)
        toast.success(`Added ${PLATFORM_META[platform]?.label ?? platform}`)
      }
    } catch {
      toast.error("Failed to add destination")
    }
  }, [roomCode])

  const handleRemoveDestination = useCallback(async (platform: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/stream-live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", platform }),
      })
      if (res.ok) {
        useStudioStore.getState().removeStreamPlatform(platform)
        toast.info(`Removed ${PLATFORM_META[platform]?.label ?? platform}`)
      }
    } catch {
      toast.error("Failed to remove destination")
    }
  }, [roomCode])

  // The trigger button shown in the control bar
  const triggerButton = isLive ? (
    <button
      type="button"
      className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-[11px] font-medium min-w-15 select-none bg-red-500/20 text-red-400 hover:bg-red-500/30"
    >
      <span className="relative flex items-center gap-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <Radio className="w-5 h-5" />
      </span>
      <span>LIVE</span>
    </button>
  ) : (
    <button
      type="button"
      className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all text-[11px] font-semibold min-w-15 select-none bg-gradient-to-r from-red-600 to-violet-600 text-white hover:from-red-500 hover:to-violet-500 shadow-lg shadow-violet-500/20"
    >
      <Radio className="w-5 h-5" />
      <span>Go Live</span>
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerButton} />
      <DialogContent className="bg-[#111111] border border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            {isLive ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-red-400 font-bold text-xs uppercase tracking-wider">LIVE</span>
                {streamStartedAt && <LiveTimer startedAt={streamStartedAt} />}
              </>
            ) : (
              "Go Live"
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {isLive ? (
            /* ── Live state: show current destinations ── */
            <>
              <p className="text-xs text-gray-400">Currently streaming to:</p>
              <div className="space-y-2">
                {platformStatuses.map((ps) => {
                  const isStreaming = streamPlatforms.includes(ps.platform)
                  return (
                    <div
                      key={ps.platform}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <PlatformIcon platform={ps.platform} size={18} />
                        <div>
                          <p className="text-sm font-medium text-white">{PLATFORM_META[ps.platform]?.label ?? ps.platform}</p>
                          <p className="text-[11px] text-gray-500">{ps.channelName}</p>
                        </div>
                      </div>
                      {isStreaming ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-950/50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Streaming
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDestination(ps.platform)}
                            className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ) : ps.hasStreamKey ? (
                        <button
                          type="button"
                          onClick={() => handleAddDestination(ps.platform)}
                          className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          + Add
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-600">No stream key</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <Button
                onClick={handleEndStream}
                disabled={stopping}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold mt-2"
              >
                {stopping ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Ending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Square className="w-4 h-4" />
                    End Stream
                  </span>
                )}
              </Button>
            </>
          ) : (
            /* ── Pre-live state: select destinations ── */
            <>
              {/* Broadcast info preview + YouTube metadata status */}
              {(streamTitle || streamDescription) && (
                <div className="bg-white/[0.03] rounded-lg px-3 py-2.5 mb-3 border border-white/5">
                  {streamTitle && (
                    <p className="text-sm font-medium text-white truncate">{streamTitle}</p>
                  )}
                  {streamDescription && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{streamDescription}</p>
                  )}
                  {/* Per-platform metadata status hint */}
                  {(() => {
                    const ytStatus = platformStatuses.find((ps) => ps.platform.toLowerCase() === "youtube")
                    if (!ytStatus || !selectedPlatforms.has(ytStatus.platform)) return (
                      <p className="text-[10px] text-gray-600 mt-1">This info is sent to your streaming platforms.</p>
                    )
                    if (ytStatus.hasOAuthToken) return (
                      <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 inline" />
                        Title &amp; description will be set automatically on YouTube.
                      </p>
                    )
                    return (
                      <p className="text-[10px] text-amber-600 mt-1">
                        YouTube connected via stream key only — update title &amp; description in{" "}
                        <a
                          href="https://studio.youtube.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-amber-400 transition-colors"
                        >
                          YouTube Studio
                        </a>{" "}
                        before going live.
                      </p>
                    )
                  })()}
                </div>
              )}

              <p className="text-xs text-gray-400">Select platforms to stream to:</p>
              <div className="space-y-2">
                {platformStatuses.length === 0 && connectedPlatforms.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <p className="text-sm text-gray-400">No platforms connected.</p>
                    <a
                      href="/settings/platforms"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Connect a platform
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {platformStatuses.map((ps) => (
                  <label
                    key={ps.platform}
                    className={[
                      "flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all",
                      ps.hasStreamKey
                        ? selectedPlatforms.has(ps.platform)
                          ? "bg-violet-500/10 border-violet-500/30 cursor-pointer"
                          : "bg-white/5 border-white/5 cursor-pointer hover:border-white/10"
                        : "bg-white/[0.02] border-white/5 opacity-60",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2.5">
                      {ps.hasStreamKey ? (
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.has(ps.platform)}
                          onChange={() => togglePlatform(ps.platform)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0"
                        />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-gray-600" />
                      )}
                      <PlatformIcon platform={ps.platform} size={18} />
                      <div>
                        <p className="text-sm font-medium text-white">{PLATFORM_META[ps.platform]?.label ?? ps.platform}</p>
                        <p className="text-[11px] text-gray-500">{ps.channelName}</p>
                      </div>
                    </div>
                    {ps.hasStreamKey ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <a
                        href="/settings/platforms"
                        className="inline-flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Set up stream key <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </label>
                ))}
              </div>

              {/* YouTube backup server tip */}
              {selectedPlatforms.has("youtube") && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-950/40 border border-blue-800/40 px-3 py-2.5 mt-1">
                  <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-blue-300 leading-relaxed">
                    Tip: Add a backup server URL in{" "}
                    <a href="/settings/platforms" className="underline hover:text-blue-200 transition-colors">
                      Settings
                    </a>{" "}
                    to prevent &quot;duplicate ingestion&quot; warnings if your connection drops.
                  </p>
                </div>
              )}

              {/* Custom RTMP destinations */}
              {customRtmpDests.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs text-gray-400">Custom RTMP destinations:</p>
                  {customRtmpDests.map((dest) => (
                    <label
                      key={dest.id}
                      className={[
                        "flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all cursor-pointer",
                        selectedCustomRtmp.has(dest.id)
                          ? "bg-violet-500/10 border-violet-500/30"
                          : "bg-white/5 border-white/5 hover:border-white/10",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedCustomRtmp.has(dest.id)}
                          onChange={() => {
                            setSelectedCustomRtmp((prev) => {
                              const next = new Set(prev)
                              if (next.has(dest.id)) next.delete(dest.id)
                              else next.add(dest.id)
                              return next
                            })
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0"
                        />
                        <div className="w-[18px] h-[18px] rounded bg-gray-700 flex items-center justify-center text-[8px] font-bold text-white">
                          R
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{dest.name}</p>
                          <p className="text-[11px] text-gray-500 truncate max-w-48">{dest.ingestUrl}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {customRtmpDests.length === 0 && (
                <a
                  href="/settings/platforms"
                  className="block text-center text-[11px] text-gray-600 hover:text-gray-400 mt-2 transition-colors"
                >
                  + Add custom RTMP destination
                </a>
              )}

              <div className="flex gap-2 mt-2">
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGoLive}
                  disabled={starting || (selectedPlatforms.size + selectedCustomRtmp.size) === 0}
                  className="flex-1 bg-gradient-to-r from-red-600 to-violet-600 hover:from-red-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:shadow-none"
                >
                  {starting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Radio className="w-4 h-4" />
                      Go Live ({selectedPlatforms.size + selectedCustomRtmp.size})
                    </span>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
