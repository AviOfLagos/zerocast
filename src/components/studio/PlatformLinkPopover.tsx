"use client"

import { useEffect, useRef, useState } from "react"

import { Check, Copy, ExternalLink, QrCode, X } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

import PlatformIcon, { PLATFORM_META } from "@/components/ui/PlatformIcon"
import { PLATFORM_COLORS } from "@/components/chat/PlatformBadge"

interface PlatformLinkPopoverProps {
  platform: string
  channelName: string
  /** Resolved viewer URL; null/undefined disables the popover actions. */
  url?: string | null
}

/**
 * F-23: clickable platform pill that opens a small popover with copy / open
 * viewer-link actions. Pill itself looks identical to the static pill in the
 * header so the existing visual identity is preserved.
 *
 * When `url` is missing (resolver couldn't find one, or the stream is not yet
 * live), the trigger is still rendered for layout consistency but actions are
 * disabled with an explanatory tooltip.
 */
export default function PlatformLinkPopover({ platform, channelName, url }: PlatformLinkPopoverProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const label = PLATFORM_META[platform]?.label ?? platform
  const accentColor = (PLATFORM_COLORS as Record<string, string>)[platform] ?? "#6b7280"

  // Close on outside click + Escape (popover only; QR modal handles its own).
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !qrOpen) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, qrOpen])

  // QR modal Esc-to-close.
  useEffect(() => {
    if (!qrOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQrOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [qrOpen])

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(`${label} link copied`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access")
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={url
          ? `${label} viewer link — open menu`
          : `${label}: ${channelName} (viewer link not available)`}
        title={url ? `Click to copy ${label} watch link` : `${label}: ${channelName}`}
        className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-1.5 pr-2 py-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-bg-deep"
        style={{ borderColor: `${accentColor}33` }}
      >
        <PlatformIcon platform={platform} size={10} />
        <span className="text-[10px] font-medium text-gray-200">{label}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full mt-1.5 left-0 z-50 min-w-[14rem] bg-studio-panel border border-white/10 rounded-xl shadow-2xl p-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150"
        >
          <div className="flex items-center gap-2 px-2 pb-1.5 mb-1.5 border-b border-white/8">
            <PlatformIcon platform={platform} size={14} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-white truncate">{label}</p>
              <p className="text-[10px] text-gray-500 truncate">{channelName}</p>
            </div>
          </div>

          {url ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  handleCopy()
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-gray-200 hover:bg-white/8 hover:text-white transition-colors focus:outline-none focus-visible:bg-white/8"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                )}
                <span className="flex-1 text-left">{copied ? "Copied!" : "Copy watch link"}</span>
              </button>
              <a
                role="menuitem"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-gray-200 hover:bg-white/8 hover:text-white transition-colors focus:outline-none focus-visible:bg-white/8"
              >
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">Open in new tab</span>
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setQrOpen(true)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-gray-200 hover:bg-white/8 hover:text-white transition-colors focus:outline-none focus-visible:bg-white/8"
              >
                <QrCode className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">Show QR code</span>
              </button>
              <p className="px-2 pt-1 text-[9px] text-gray-600 break-all">{url}</p>
            </>
          ) : (
            <p className="px-2 py-2 text-[11px] text-gray-500 leading-snug">
              No watch link yet. Available once the stream is live.
            </p>
          )}
        </div>
      )}

      {/* QR modal — rendered at document scope via fixed positioning so it
          escapes the popover wrapper and centres over the studio. */}
      {qrOpen && url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} viewer QR code`}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="w-full max-w-xs bg-studio-panel border border-white/10 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
              <PlatformIcon platform={platform} size={14} />
              <span className="text-sm font-semibold text-white flex-1 truncate">
                {label} viewer link
              </span>
              <button
                type="button"
                autoFocus
                onClick={() => setQrOpen(false)}
                aria-label="Close QR code"
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center gap-3">
              <div className="bg-white p-3 rounded-lg shadow-md">
                <QRCodeSVG
                  value={url}
                  size={208}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="text-[10px] text-gray-500 text-center leading-snug break-all">
                {url}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors focus:outline-none focus-visible:underline rounded px-2 py-1"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
