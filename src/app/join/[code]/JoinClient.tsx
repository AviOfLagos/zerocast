"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { LiveKitRoom, RoomAudioRenderer, StartAudio, usePreviewTracks } from "@livekit/components-react"
import { LocalVideoTrack } from "livekit-client"
import { AlertCircle, Camera, CameraOff, Mic, MicOff, UserX, Video } from "lucide-react"
import posthog from "posthog-js"
import { AudioLevelBar } from "@/components/studio/AudioLevelIndicator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SSEEventData } from "@/lib/chat/types"
import { SSEEventDataSchema } from "@/lib/schemas/sse"
import { GuestRequestResponseSchema } from "@/lib/schemas/guest"
import Spinner from "@/components/ui/Spinner"
import useVisualViewport from "@/hooks/useVisualViewport"
import GuestStudio from "./GuestStudio"

type JoinStatus = "form" | "preview" | "waiting" | "denied" | "joining" | "joined" | "timeout" | "room-full" | "kicked"

interface JoinClientProps {
  roomCode: string
  livekitUrl: string
}

/** F-13: Device preview component — camera/mic preview before requesting to join */
function DevicePreview({
  videoEnabled,
  audioEnabled,
  onToggleVideo,
  onToggleAudio,
  onDeviceError,
}: {
  videoEnabled: boolean
  audioEnabled: boolean
  onToggleVideo: () => void
  onToggleAudio: () => void
  onDeviceError: (err: Error) => void
}) {
  const tracks = usePreviewTracks(
    {
      audio: audioEnabled,
      video: videoEnabled,
    },
    onDeviceError
  )

  const videoRef = useRef<HTMLVideoElement>(null)

  // Extract raw audio MediaStreamTrack for level meter
  const audioTrack = tracks?.find((t) => t.kind === "audio")
  const audioMediaStreamTrack = audioTrack?.mediaStreamTrack ?? null

  // Attach/detach video track to the preview element
  useEffect(() => {
    const el = videoRef.current
    if (!el || !tracks) return
    const videoTrack = tracks.find(
      (t) => t.kind === "video"
    ) as LocalVideoTrack | undefined
    if (videoTrack) {
      videoTrack.attach(el)
      return () => {
        videoTrack.detach(el)
      }
    }
  }, [tracks])

  // Clean up tracks on unmount
  useEffect(() => {
    return () => {
      tracks?.forEach((t) => t.stop())
    }
  }, [tracks])

  return (
    <div className="space-y-3">
      {/* Video preview */}
      <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden">
        {videoEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <CameraOff className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        )}
      </div>

      {/* Device toggle buttons + audio level */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onToggleVideo}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            videoEnabled
              ? "bg-white/6 text-gray-300 hover:bg-white/10"
              : "bg-red-500/10 text-red-400 hover:bg-red-500/20",
          ].join(" ")}
        >
          {videoEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
          {videoEnabled ? "Camera On" : "Camera Off"}
        </button>
        <button
          type="button"
          onClick={onToggleAudio}
          className={[
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            audioEnabled
              ? "bg-white/6 text-gray-300 hover:bg-white/10"
              : "bg-red-500/10 text-red-400 hover:bg-red-500/20",
          ].join(" ")}
        >
          {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          {audioEnabled ? "Mic On" : "Mic Off"}
        </button>
      </div>

      {/* Audio level meter — confirms mic is picking up sound */}
      {audioEnabled && audioMediaStreamTrack && (
        <div className="flex items-center justify-center gap-2">
          <Mic className="w-3.5 h-3.5 text-gray-500" />
          <AudioLevelBar mediaStreamTrack={audioMediaStreamTrack} barCount={7} />
          <span className="text-[10px] text-gray-500">Speak to test your mic</span>
        </div>
      )}
    </div>
  )
}

export default function JoinClient({ roomCode, livekitUrl }: JoinClientProps) {
  const viewport = useVisualViewport()
  const startAudioBottom = viewport.keyboardOpen
    ? Math.max(96, window.innerHeight - viewport.height + 24)
    : 96

  const [status, setStatus] = useState<JoinStatus>("form")
  const [requesting, setRequesting] = useState(false)
  const [waitingSince, setWaitingSince] = useState<number | null>(null)
  const [waitElapsed, setWaitElapsed] = useState(0)
  const [sseRetryNonce, setSseRetryNonce] = useState(0)
  const [displayName, setDisplayName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestId, setGuestId] = useState<string | null>(null)
  const [livekitToken, setLivekitToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sseError, setSseError] = useState(false)
  const [studioEnded, setStudioEnded] = useState(false)
  const sseRef = useRef<EventSource | null>(null)
  // Persists across LiveKit disconnect so onDisconnected can differentiate kick vs. drop
  const wasKickedRef = useRef(false)

  // F-13: Device preview state
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [deviceError, setDeviceError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  // Track whether preview tracks have been released (prevents mic conflict with LiveKit room)
  const [previewReleased, setPreviewReleased] = useState(false)

  // F-13: Denial cooldown (30 seconds)
  const [denialCooldown, setDenialCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleSSEEvent = useCallback((event: SSEEventData) => {
    if (event.type === "GUEST_ADMITTED" && event.data.guestId === guestId) {
      setLivekitToken(event.data.token)
      // Small delay to ensure preview tracks are fully released before LiveKit room acquires mic
      setStatus("joining")
      setTimeout(() => {
        setPreviewReleased(true)
        setStatus("joined")
      }, 600)
    }
    if (event.type === "GUEST_DENIED" && event.data.guestId === guestId) {
      setStatus("denied")
      // Start 30-second cooldown
      setDenialCooldown(30)
      if (cooldownRef.current) clearInterval(cooldownRef.current)
      cooldownRef.current = setInterval(() => {
        setDenialCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    if (event.type === "STUDIO_ENDED") {
      window.location.href = "/studio-ended"
    }
    if (event.type === "STUDIO_PAUSED") {
      // Host paused — bounce guest back to landing; they can rejoin later if
      // the host resumes from the same room code.
      window.location.href = "/studio-paused"
    }
  }, [guestId])

  // Clean up cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  // Drive the waiting-state elapsed counter (resets when leaving waiting).
  useEffect(() => {
    if (status !== "waiting" || !waitingSince) {
      setWaitElapsed(0)
      return
    }
    const tick = () => setWaitElapsed(Math.floor((Date.now() - waitingSince) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status, waitingSince])

  useEffect(() => {
    if (status !== "waiting" || !guestId) return

    const since = Date.now() - 1000
    const es = new EventSource(`/api/rooms/${roomCode}/stream?since=${since}`)
    sseRef.current = es

    es.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data)
        const parsed = SSEEventDataSchema.safeParse(raw)
        if (parsed.success) {
          setSseError(false)
          handleSSEEvent(parsed.data)
        }
      } catch {}
    }

    es.onerror = () => {
      setSseError(true)
    }

    const timer = setTimeout(() => setStatus("timeout"), 3 * 60 * 1000)

    return () => { es.close(); clearTimeout(timer) }
  }, [status, guestId, roomCode, handleSSEEvent, sseRetryNonce])

  // F-13: Handle device permission errors
  const handleDeviceError = (err: Error) => {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      setPermissionDenied(true)
      setVideoEnabled(false)
      setAudioEnabled(false)
      setDeviceError(null)
    } else if (err.name === "NotFoundError") {
      // Device not found — can still join
      setDeviceError("No camera or microphone detected. You can still join.")
    } else {
      setDeviceError(err.message)
    }
  }

  // F-13: Proceed to preview step after entering name
  const handleContinueToPreview = () => {
    if (!displayName.trim()) return
    setError(null)
    setStatus("preview")
  }

  const handleRequestJoin = async () => {
    if (!displayName.trim() || requesting) return
    setError(null)
    setRequesting(true)

    try {
      const payload: Record<string, string> = { name: displayName.trim() }
      if (guestEmail.trim()) payload.email = guestEmail.trim()

      const res = await fetch(`/api/rooms/${roomCode}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        const msg: string = data.error ?? "Failed to send request"
        if (msg.toLowerCase().includes("ended") || msg.toLowerCase().includes("not found")) {
          setStudioEnded(true)
          setStatus("form")
        } else if (msg.toLowerCase().includes("full")) {
          setStatus("room-full")
        } else {
          setError(msg)
        }
        return
      }

      const data = await res.json()
      const parsed = GuestRequestResponseSchema.safeParse(data)
      const resolvedGuestId = parsed.success ? parsed.data.guestId : data.guestId
      setGuestId(resolvedGuestId)

      posthog.capture("guest_join_requested", {
        room_code: roomCode,
        has_video: videoEnabled,
        has_audio: audioEnabled,
      })

      // Auto-admitted: go straight to waiting for SSE to deliver the token
      // (the GUEST_ADMITTED event was already published server-side)
      setStatus("waiting")
      setWaitingSince(Date.now())
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setRequesting(false)
    }
  }

  // Form state — enter display name
  if (status === "form") {
    // G20: studio has ended — show a dedicated message instead of the form
    if (studioEnded) {
      return (
        <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
          <Card className="w-full max-w-md bg-[#111111] border-white/6 text-center">
            <CardContent className="py-10 space-y-3">
              <p className="text-white font-semibold">This studio has ended.</p>
              <Link href="/" className="text-sm text-gray-400 hover:text-white underline underline-offset-2 transition-colors">
                Go home
              </Link>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-[#111111] border-white/6">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6 text-indigo-400" />
            </div>
            <CardTitle className="text-white text-xl">Join Studio</CardTitle>
            <CardDescription className="text-gray-400">
              Room <span className="font-mono text-gray-300">{roomCode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300 text-sm">Your display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinueToPreview()}
                placeholder="Enter your name..."
                className="mt-1.5 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                autoFocus
                maxLength={30}
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm">
                Email <span className="text-gray-600">(optional)</span>
              </Label>
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinueToPreview()}
                placeholder="you@example.com"
                className="mt-1.5 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                maxLength={200}
              />
              <p className="text-xs text-gray-600 mt-1">
                No account needed — just so the host knows who you are.
              </p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button
              onClick={handleContinueToPreview}
              disabled={!displayName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500"
            >
              Continue
            </Button>
            <p className="text-center text-gray-500 text-xs">
              Next: preview your camera and microphone
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // F-13: Device preview step — camera/mic preview before requesting to join
  if (status === "preview") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <Card className="w-full max-w-lg bg-[#111111] border-white/6">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-white text-xl">Preview your devices</CardTitle>
            <CardDescription className="text-gray-400">
              Check your camera and microphone before joining as <span className="text-gray-300 font-medium">{displayName}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Permission denied instructions */}
            {permissionDenied && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-300 font-medium mb-1">Camera/microphone access denied</p>
                  <p className="text-yellow-200/70 text-xs">
                    To enable, click the camera icon in your browser address bar, allow access, then reload this page.
                    You can still join without camera or microphone.
                  </p>
                </div>
              </div>
            )}

            {/* Device error notice */}
            {deviceError && !permissionDenied && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-300 text-sm">{deviceError}</p>
              </div>
            )}

            {/* Device preview */}
            {!permissionDenied && (
              <DevicePreview
                videoEnabled={videoEnabled}
                audioEnabled={audioEnabled}
                onToggleVideo={() => setVideoEnabled((v) => !v)}
                onToggleAudio={() => setAudioEnabled((a) => !a)}
                onDeviceError={handleDeviceError}
              />
            )}

            {/* Permission denied — show avatar placeholder */}
            {permissionDenied && (
              <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-2">
                    <CameraOff className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-500 text-sm">Joining without camera/mic</p>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStatus("form")}
                className="flex-1 border-gray-700 text-gray-300"
              >
                Back
              </Button>
              <Button
                onClick={handleRequestJoin}
                disabled={requesting || !displayName.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {requesting ? (
                  <span className="inline-flex items-center gap-2 text-white">
                    <Spinner size="sm" />
                    Requesting…
                  </span>
                ) : (
                  "Request to Join"
                )}
              </Button>
            </div>

            <p className="text-center text-gray-500 text-xs">
              The host will need to approve your request
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Waiting state — F-13: improved animated waiting room
  if (status === "waiting") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Card className="w-full max-w-sm bg-[#111111] border-white/6 text-center">
          <CardContent className="py-10">
            {/* Animated waiting indicator */}
            <div className="flex items-center justify-center gap-1.5 mb-5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 motion-safe:animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 motion-safe:animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 motion-safe:animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <h2 className="text-white font-semibold mb-1">Waiting for host to let you in...</h2>
            <p className="text-gray-400 text-sm">
              The host has been notified of your request.
            </p>
            <p
              role="status"
              aria-live="polite"
              className="text-gray-500 text-xs mt-2 font-mono tabular-nums"
            >
              Waiting · {Math.floor(waitElapsed / 60)}:{String(waitElapsed % 60).padStart(2, "0")}
            </p>
            <p className="text-gray-600 text-xs mt-3">
              Joining as <span className="text-gray-400">{displayName}</span>
              {videoEnabled && " with camera"}
              {audioEnabled && (videoEnabled ? " and mic" : " with mic")}
              {!videoEnabled && !audioEnabled && " (no camera/mic)"}
            </p>
            {/* G18: SSE connection interrupted notice + retry CTA */}
            {sseError && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                <span className="text-yellow-400/80">Connection interrupted.</span>
                <button
                  type="button"
                  onClick={() => {
                    setSseError(false)
                    setSseRetryNonce((n) => n + 1)
                  }}
                  className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded px-1"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="mt-5 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (sseRef.current) {
                    sseRef.current.close()
                    sseRef.current = null
                  }
                  setGuestId(null)
                  setWaitingSince(null)
                  setStatus("preview")
                }}
                className="text-xs text-gray-500 hover:text-gray-300 underline-offset-4 hover:underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded px-2 py-1"
              >
                Cancel request
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Timeout state (G19)
  if (status === "timeout") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 py-20 px-6 text-center">
          <p className="text-white font-semibold">Host hasn&apos;t responded</p>
          <p className="text-gray-400 text-sm">The request timed out after 3 minutes.</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus("waiting")}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white/6 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            >
              Keep Waiting
            </button>
            <button
              type="button"
              onClick={() => { setStatus("form"); setGuestId(null); }}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white/6 text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // F-13: Room full state
  if (status === "room-full") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Card className="w-full max-w-sm bg-[#111111] border-white/6 text-center">
          <CardContent className="py-10">
            <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-white font-semibold mb-1">Room is full</h2>
            <p className="text-gray-400 text-sm mb-4">
              This studio has reached its maximum number of participants. Please try again later.
            </p>
            <Button
              variant="outline"
              onClick={() => { setStatus("form"); setGuestId(null); setError(null) }}
              className="border-gray-700 text-gray-300"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // F-13: Denied state with 30-second cooldown before re-requesting
  if (status === "denied") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Card className="w-full max-w-sm bg-[#111111] border-white/6 text-center">
          <CardContent className="py-10">
            <UserX className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h2 className="text-white font-semibold mb-1">Not admitted</h2>
            <p className="text-gray-400 text-sm mb-4">
              The host isn&apos;t able to admit you right now.
            </p>
            <Button
              variant="outline"
              onClick={() => { setStatus("form"); setGuestId(null); setError(null); setDenialCooldown(0) }}
              disabled={denialCooldown > 0}
              className="border-gray-700 text-gray-300"
            >
              {denialCooldown > 0 ? `Try again in ${denialCooldown}s` : "Try Again"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Kicked state — shown when the host removes the guest from the studio
  if (status === "kicked") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-[#111111] border-white/6 text-center">
          <CardContent className="py-10 space-y-4">
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <UserX className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg mb-1">You were removed from the studio</h2>
              <p className="text-gray-400 text-sm">
                The host has removed you from this session.
              </p>
            </div>
            <div className="pt-2 space-y-3">
              <Button
                onClick={() => {
                  setGuestId(null)
                  setLivekitToken(null)
                  setPreviewReleased(false)
                  setError(null)
                  setStatus("preview")
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                Request to Rejoin
              </Button>
              <p className="text-xs text-gray-600">
                The host will need to approve your request.
              </p>
            </div>
            <p className="text-xs text-gray-700 pt-1">
              If you believe this was a mistake, contact the host.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Joining / connected state
  if (status === "joining" || status === "joined") {
    if (!livekitToken) return null

    return (
      <LiveKitRoom
        token={livekitToken}
        serverUrl={livekitUrl}
        connect={previewReleased}
        video={videoEnabled}
        audio={audioEnabled}
        options={{
          audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true, echoCancellation: true },
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
              if (context.retryCount >= 5) return null
              return Math.min(1000 * Math.pow(2, context.retryCount), 8000)
            },
          },
        }}
        onDisconnected={() => {
          if (wasKickedRef.current) {
            wasKickedRef.current = false
            setStatus("kicked")
          }
          // If not kicked, LiveKit's own reconnect logic handles transient drops.
          // A studio-ended event comes via SSE and redirects separately.
        }}
        className="h-screen"
      >
        {/* RoomAudioRenderer creates hidden <audio> elements for each remote participant.
            This is the primary mechanism for participants to hear each other (like StreamYard/Meet SFU model). */}
        <RoomAudioRenderer />
        {/* StartAudio handles browser autoplay policy — shows button when audio context is suspended */}
        <StartAudio
          label="Click to enable audio"
          style={{ bottom: startAudioBottom }}
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium shadow-lg transition-all motion-safe:animate-pulse"
        />
        <GuestStudio
          roomCode={roomCode}
          displayName={displayName}
          onKicked={() => { wasKickedRef.current = true }}
        />
      </LiveKitRoom>
    )
  }

  return null
}
