"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, Download, ExternalLink, Users } from "lucide-react"
import posthog from "posthog-js"

import type { SessionSummary } from "./page"

interface Props {
  summary: SessionSummary
  limitedStats?: boolean
}

// Platform display config
const PLATFORM_CONFIG: Record<string, { label: string; color: string; barColor: string }> = {
  youtube: { label: "YouTube", color: "bg-red-500", barColor: "#ef4444" },
  twitch: { label: "Twitch", color: "bg-purple-500", barColor: "#a855f7" },
  kick: { label: "Kick", color: "bg-green-500", barColor: "#22c55e" },
  tiktok: { label: "TikTok", color: "bg-slate-400", barColor: "#94a3b8" },
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatEndedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: React.ReactNode
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-[#141414] rounded-2xl p-5 border border-white/6 flex flex-col gap-1">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-sm text-gray-500">{label}</span>
      {sub && <span className="text-xs text-gray-600 mt-0.5">{sub}</span>}
    </div>
  )
}

export default function SessionSummaryClient({ summary, limitedStats }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    posthog.capture("session_summary_viewed", {
      room_code: summary.code,
      duration_seconds: summary.durationSeconds,
      participant_count: summary.participantCount,
      message_count: summary.messageCount,
      platform_count: summary.platforms.length,
      platforms: summary.platforms,
      limited_stats: limitedStats ?? false,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const duration = formatDuration(summary.durationSeconds)
  const endedAtFormatted = formatEndedAt(summary.endedAt)

  // Platform bars — each platform gets a proportional bar.
  // Since we only track total message count, not per-platform, we show all connected platforms equally.
  // If there are messages and platforms, distribute proportionally (equal for now — platform message breakdown
  // is not tracked per-platform, so show equal bars for each connected platform with messages).
  const hasPlatformBars = summary.platforms.length > 0 && summary.messageCount > 0
  const perPlatformCount =
    hasPlatformBars ? Math.ceil(summary.messageCount / summary.platforms.length) : 0
  const maxCount = perPlatformCount

  // Share URLs
  const shareText = `Just wrapped a live session on Zerocast! 🎬 ${duration}, ${summary.participantCount} guests, ${summary.messageCount} chat messages. #Zerocast`
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
  const linkedInUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent("https://zerocast.live")}&title=${encodeURIComponent("Zerocast Session Recap")}&summary=${encodeURIComponent(shareText)}`

  const handleCopyStats = async () => {
    const text = `Zerocast session recap: ${duration} | ${summary.participantCount} guests | ${summary.messageCount} messages`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#080808] py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center ring-1 ring-green-500/30">
              <Check className="w-7 h-7 text-green-400" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Session Complete</h1>
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-gray-400 text-sm bg-white/5 px-3 py-1 rounded-lg">
              {summary.code}
            </span>
            <span className="text-gray-600 text-xs">Ended {endedAtFormatted}</span>
          </div>
        </div>

        {/* Limited-stats banner */}
        {limitedStats && (
          <p className="bg-white/4 text-gray-500 text-xs text-center rounded-xl px-4 py-2">
            Detailed stats are no longer available. Showing basic session info from our records.
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Duration" value={duration} />
          <StatCard
            label="Participants on stage"
            value={summary.participantCount}
            sub={
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Peak: {summary.peakParticipants}
              </span>
            }
          />
          <StatCard label="Peak participants" value={summary.peakParticipants} />
          <StatCard label="Chat messages" value={summary.messageCount} />
        </div>

        {/* Platforms connected */}
        {summary.platforms.length > 0 && (
          <div className="bg-[#141414] rounded-2xl p-5 border border-white/6">
            <p className="text-sm text-gray-500 mb-3">Platforms connected</p>
            <div className="flex flex-wrap gap-2">
              {summary.platforms.map((p) => {
                const cfg = PLATFORM_CONFIG[p] ?? { label: p, color: "bg-gray-600", barColor: "#6b7280" }
                return (
                  <span
                    key={p}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${cfg.color}/20 border border-white/6`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
                    {cfg.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Platform bar chart */}
        {hasPlatformBars && (
          <div className="bg-[#141414] rounded-2xl p-5 border border-white/6">
            <p className="text-sm text-gray-500 mb-4">Platform Activity</p>
            <div className="flex items-end gap-6 h-28">
              {summary.platforms.map((p) => {
                const cfg = PLATFORM_CONFIG[p] ?? { label: p, color: "bg-gray-600", barColor: "#6b7280" }
                const heightPct = maxCount > 0 ? Math.round((perPlatformCount / maxCount) * 100) : 0
                return (
                  <div key={p} className="flex flex-col items-center gap-2 flex-1">
                    <span className="text-xs text-gray-400 font-medium">{perPlatformCount}</span>
                    <div className="w-full rounded-t-lg" style={{ height: `${heightPct}%`, backgroundColor: cfg.barColor }} />
                    <span className="text-xs text-gray-500">{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Social sharing */}
        <div className="bg-[#141414] rounded-2xl p-5 border border-white/6 space-y-3">
          <p className="text-sm text-gray-500">Share your session</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/6 hover:bg-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Share on X
            </a>
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/6 hover:bg-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Share on LinkedIn
            </a>
          </div>
        </div>

        {/* Copy stats + Download recording */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleCopyStats}
            className="bg-white/6 hover:bg-white/10 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
          >
            {copied ? "Copied!" : "Copy stats"}
          </button>
          {summary.recordingUrl && (
            <a
              href={summary.recordingUrl}
              download
              onClick={() =>
                posthog.capture("recording_downloaded", { room_code: summary.code })
              }
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]"
            >
              <Download className="w-4 h-4" />
              Download recording
            </a>
          )}
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Dashboard
          </Link>
          <span className="w-px h-4 bg-white/10" />
          <Link
            href="/dashboard"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            Start new session
          </Link>
        </div>
      </div>
    </div>
  )
}
