"use client"

import { useCallback, useEffect, useRef } from "react"

type ToneId = "guest-join" | "stream-error" | "stream-live"

const STORAGE_KEY = "zc.studio.sounds.enabled"

interface Tone {
  /** Frequencies in Hz, played in sequence. */
  freqs: number[]
  /** Step duration in ms. */
  step: number
  /** Master gain (0..1). */
  gain?: number
  /** Wave shape. */
  type?: OscillatorType
}

const TONES: Record<ToneId, Tone> = {
  // Pleasant two-note rise — for guest join.
  "guest-join": { freqs: [880, 1320], step: 110, gain: 0.08, type: "sine" },
  // Two-note fall — for stream errors.
  "stream-error": { freqs: [392, 220], step: 160, gain: 0.1, type: "triangle" },
  // Quick double-blip — for stream live.
  "stream-live": { freqs: [659, 988, 1319], step: 90, gain: 0.08, type: "sine" },
}

function isSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    // Default-on; only off when explicitly set to "0".
    return v !== "0"
  } catch {
    return true
  }
}

/**
 * Studio notification sounds. Synthesizes short tones via the Web Audio API
 * (no asset bundle) and optionally surfaces a desktop Notification when
 * permission has been granted by the user.
 *
 * Returns a stable `play(tone, opts)` function plus helpers for the desktop
 * notification permission flow. All sounds gated by the
 * `zc.studio.sounds.enabled` localStorage flag (default on).
 */
export default function useNotificationSound() {
  // Lazily-created shared AudioContext — Web Audio requires a user gesture to
  // start in most browsers, so we delay creation until the first play call.
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    return () => {
      // Best-effort cleanup; ignore if context already closed.
      void ctxRef.current?.close().catch(() => {})
      ctxRef.current = null
    }
  }, [])

  const getContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null
    if (!ctxRef.current) {
      try {
        type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }
        const w = window as WebkitWindow
        const AudioCtx = window.AudioContext ?? w.webkitAudioContext
        if (!AudioCtx) return null
        ctxRef.current = new AudioCtx()
      } catch {
        return null
      }
    }
    return ctxRef.current
  }, [])

  const play = useCallback(
    (tone: ToneId, opts?: { showNotification?: { title: string; body?: string } }) => {
      if (!isSoundsEnabled()) return
      const ctx = getContext()
      if (!ctx) return
      // Resume if suspended (autoplay policy on Chrome / Safari).
      if (ctx.state === "suspended") void ctx.resume().catch(() => {})

      const cfg = TONES[tone]
      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.gain.value = cfg.gain ?? 0.08
      gain.connect(ctx.destination)

      cfg.freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        osc.type = cfg.type ?? "sine"
        osc.frequency.value = freq
        const start = now + (i * cfg.step) / 1000
        const stop = start + cfg.step / 1000
        const env = ctx.createGain()
        // Tiny attack/decay envelope so notes don't click.
        env.gain.setValueAtTime(0, start)
        env.gain.linearRampToValueAtTime(1, start + 0.015)
        env.gain.linearRampToValueAtTime(0, stop)
        osc.connect(env)
        env.connect(gain)
        osc.start(start)
        osc.stop(stop + 0.02)
      })

      // Best-effort desktop notification.
      if (opts?.showNotification && typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted" && document.hidden) {
          try {
            new Notification(opts.showNotification.title, {
              body: opts.showNotification.body,
              icon: "/favicon.ico",
              silent: false,
            })
          } catch {
            /* notification rejected by browser — silent fallback */
          }
        }
      }
    },
    [getContext]
  )

  const setEnabled = useCallback((enabled: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0")
    } catch {
      /* localStorage blocked — preference applies for session only */
    }
  }, [])

  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) return "denied"
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return Notification.permission
    }
    try {
      return await Notification.requestPermission()
    } catch {
      return "denied"
    }
  }, [])

  return { play, setEnabled, requestNotificationPermission, isEnabled: isSoundsEnabled }
}
