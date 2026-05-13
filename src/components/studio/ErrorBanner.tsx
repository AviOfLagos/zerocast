"use client"

import { AlertCircle, X } from "lucide-react"

export interface CriticalError {
  id: string
  title: string
  detail?: string
  /** Optional retry action — shown as a button after the message. */
  retry?: { label: string; onRetry: () => void }
}

interface ErrorBannerStackProps {
  errors: CriticalError[]
  onDismiss: (id: string) => void
}

/**
 * Stack of pinned critical-error banners. Unlike toasts, these persist until
 * the host explicitly dismisses them — designed for things like stream egress
 * crashes, LiveKit drops, or platform RTMP rejections where a 5-second toast
 * is too easy to miss.
 *
 * Renders nothing when the list is empty. Positioned at the top of the
 * stage area so it does not obscure ControlBar.
 */
export default function ErrorBannerStack({ errors, onDismiss }: ErrorBannerStackProps) {
  if (errors.length === 0) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="absolute top-1 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-1.5 w-[min(95%,32rem)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
    >
      {errors.map((err) => (
        <div
          key={err.id}
          className="flex items-start gap-2 bg-red-950/85 border border-red-500/40 text-red-100 rounded-xl px-3 py-2.5 shadow-lg backdrop-blur-sm"
        >
          <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs font-semibold text-red-100">{err.title}</p>
            {err.detail && (
              <p className="text-[11px] text-red-200/85 leading-snug">{err.detail}</p>
            )}
          </div>
          {err.retry && (
            <button
              type="button"
              onClick={err.retry.onRetry}
              className="shrink-0 text-[11px] font-medium text-red-100 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded px-1"
            >
              {err.retry.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(err.id)}
            aria-label="Dismiss"
            className="shrink-0 -my-1 -mr-1 p-1 rounded text-red-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
