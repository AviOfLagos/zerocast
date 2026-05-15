"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

interface DemoOverlayProps {
  expiresAt: number
}

function formatRemaining(seconds: number): { label: string; warn: boolean; expired: boolean } {
  if (seconds <= 0) return { label: "Expired — refresh to retry", warn: true, expired: true }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return {
    label: `Expires in ${parts.join(" ")}`,
    warn: seconds < 300,
    expired: false,
  }
}

export default function DemoOverlay({ expiresAt }: DemoOverlayProps) {
  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const remaining = expiresAt - now
  const { label, warn, expired } = formatRemaining(remaining)

  return (
    <>
      <div
        className="fixed top-4 right-4 z-50 flex flex-col items-end gap-1 pointer-events-auto"
        aria-live="polite"
      >
        <span
          className="inline-block bg-brand/10 border border-brand-soft/40 text-brand-soft uppercase tracking-widest font-semibold px-2 py-[3px] rounded-[4px]"
          style={{ fontSize: "10px" }}
        >
          Demo
        </span>
        <span
          className={`${warn ? "text-warn-text" : "text-ink-muted"} font-medium`}
          style={{ fontSize: "11px" }}
        >
          {label}
        </span>
      </div>

      {!expired && (
        <Link
          href="/login"
          className="fixed bottom-6 right-6 z-50 pointer-events-auto inline-flex items-center gap-2 bg-brand-on-light text-ink-inverse font-bold text-sm px-4 py-2 rounded-full shadow-lg hover:opacity-90 transition-opacity"
        >
          Like this? Get your own room →
        </Link>
      )}
    </>
  )
}
