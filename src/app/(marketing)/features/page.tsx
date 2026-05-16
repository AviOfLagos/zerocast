import type { Metadata } from "next"
import Link from "next/link"

import { MultistreamFan, PulseRing, SignalArc } from "@/components/marketing/illustrations"
import PlatformIcon from "@/components/ui/PlatformIcon"
import {
  ArrowRight,
  BarChart2,
  Bell,
  Bot,
  Calendar,
  Camera,
  Captions,
  CheckCircle2,
  Clock,
  Download,
  EyeOff,
  FileText,
  Globe,
  Hand,
  Headphones,
  Image as ImageIcon,
  Keyboard,
  LayoutGrid,
  Link2,
  MessageSquare,
  Mic,
  Monitor,
  Pause,
  Pin,
  Radio,
  RotateCcw,
  Save,
  Scissors,
  Shield,
  Smile,
  Sparkles,
  Type,
  UserPlus,
  UserX,
  Users,
  Video,
  Volume2,
  Zap,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Features — Browser Streaming Studio, AI Co-Host, Multistream",
  description:
    "Every Zerocast feature: browser studio with ten layout presets, AI Co-Host with Tone Matching, multistreaming to YouTube/Twitch/Kick/TikTok, live viewer counts, pre-flight checks, public recap pages, cloud recording, and more.",
  alternates: { canonical: "/features" },
}

// ── Data model ──────────────────────────────────────────────────────────────

type FeatureStatus = "live" | "coming-soon"

interface FeatureItem {
  icon: React.ReactNode
  name: string
  detail: string
  status: FeatureStatus
}

interface FeatureCategory {
  id: string
  title: string
  description: string
  features: FeatureItem[]
}

const categories: FeatureCategory[] = [
  {
    id: "studio",
    title: "Studio & Video",
    description: "Professional live studio running entirely in your browser.",
    features: [
      { icon: <Video className="w-4 h-4" />, name: "HD Video Grid", detail: "Up to 6 participants on a 1920×1080 canvas with adaptive bitrate. Same pixels you see, viewers see.", status: "live" },
      { icon: <LayoutGrid className="w-4 h-4" />, name: "Ten Slot-Based Layouts", detail: "Solo, two-side, three-row, four/five/six-grid, two spotlight variants, two screen-share variants — switch live without interruption.", status: "live" },
      { icon: <Monitor className="w-4 h-4" />, name: "Screen Sharing", detail: "Share a screen, window, or tab. Screenshares pin to a dedicated slot in layouts that have one.", status: "live" },
      { icon: <EyeOff className="w-4 h-4" />, name: "Show / Hide Toggle", detail: "Guests join backstage. Host taps Show on the participant row to bring them on screen, Hide to send them back.", status: "live" },
      { icon: <Type className="w-4 h-4" />, name: "Lower-Third Name Bars", detail: "StreamYard-style full-width gradient bars with indigo accent. Container-query sizing keeps names legible from 6-grid through solo.", status: "live" },
      { icon: <Sparkles className="w-4 h-4" />, name: "Coach Marks", detail: "Progressive first-run hints (invite a guest → connect a platform → go live), dismissed on action and remembered locally.", status: "live" },
      { icon: <Keyboard className="w-4 h-4" />, name: "Keyboard Shortcuts", detail: "M toggles mic, V toggles camera, C toggles chat sidebar, ? opens help. Ignored while typing in any input.", status: "live" },
      { icon: <Type className="w-4 h-4" />, name: "Text Overlays", detail: "Add text to the stage with 6 positions, 3 font sizes, custom text and background colors. Synced to all participants.", status: "live" },
      { icon: <ImageIcon className="w-4 h-4" />, name: "Stage Background", detail: "Set the canvas background colour from a palette of dark-theme presets. Visible to all participants and the egress composite.", status: "live" },
      { icon: <Globe className="w-4 h-4" />, name: "100% Browser-Based", detail: "No downloads, no plugins. Works on Chrome, Edge, Firefox, Safari — any device, any OS.", status: "live" },
      { icon: <Pause className="w-4 h-4" />, name: "Pause vs End", detail: "Take a break without losing the room. Pause stops the stream and dismisses guests but keeps the room reusable. End closes it permanently.", status: "live" },
    ],
  },
  {
    id: "audio",
    title: "Audio",
    description: "Crystal-clear audio with real-time monitoring and device control.",
    features: [
      { icon: <Mic className="w-4 h-4" />, name: "VU Meter", detail: "Real-time mic level bars powered by Web Audio AnalyserNode. role=meter for screen readers.", status: "live" },
      { icon: <Headphones className="w-4 h-4" />, name: "Device Selector", detail: "Pick your microphone, camera, and speaker from the control bar — available for both host and guests on every viewport.", status: "live" },
      { icon: <Zap className="w-4 h-4" />, name: "Echo Cancellation", detail: "Built-in echo cancellation, noise suppression, and auto-gain control. No external software needed.", status: "live" },
      { icon: <Volume2 className="w-4 h-4" />, name: "Sound Notifications", detail: "Audible guest-join chime + optional desktop Notification when the tab is hidden, so a solo host can step away from the screen.", status: "live" },
    ],
  },
  {
    id: "guests",
    title: "Guests & Moderation",
    description: "Full control over who joins, what they can do, and when they leave.",
    features: [
      { icon: <Users className="w-4 h-4" />, name: "Guest Join Flow", detail: "Share a link — guests preview their camera/mic, request to join, see a live waiting timer, and wait for approval. No account needed.", status: "live" },
      { icon: <Shield className="w-4 h-4" />, name: "Auto-Admit Mode", detail: "Toggle between manual approval and auto-admit. Perfect for open panels or invite-only sessions.", status: "live" },
      { icon: <UserX className="w-4 h-4" />, name: "Mute, Kick, Mute-All", detail: "Mute any guest's mic or camera, remove disruptive participants, or mute every guest in one click for emergencies.", status: "live" },
      { icon: <LayoutGrid className="w-4 h-4" />, name: "Drag-Reorder Tiles", detail: "Drag any participant row in the backstage strip to reorder on-stage placement. Pointer + keyboard sensors via dnd-kit.", status: "live" },
      { icon: <LayoutGrid className="w-4 h-4" />, name: "Off-Stage Coaching", detail: "When a guest is in the room but not on screen, they see an indigo banner so they know the host hasn't put them up yet.", status: "live" },
      { icon: <Download className="w-4 h-4" />, name: "Guest Lead Capture", detail: "Optional email field on the join form. Collect guest contact info for follow-up — no account needed.", status: "live" },
    ],
  },
  {
    id: "chat",
    title: "Multi-Platform Chat",
    description: "Every platform's chat in one scrolling panel — with personality.",
    features: [
      { icon: <MessageSquare className="w-4 h-4" />, name: "Unified Chat", detail: "YouTube, Twitch, Kick, and TikTok chat messages in one panel with platform logos and color-coded badges.", status: "live" },
      { icon: <MessageSquare className="w-4 h-4" />, name: "Multi-Line Composer", detail: "Send to YouTube and Twitch from the studio. Shift+Enter inserts a newline, Enter sends. IME-aware.", status: "live" },
      { icon: <Bot className="w-4 h-4" />, name: "AI Reply Emphasis", detail: "Messages the AI co-host has handled get an indigo tint and a bot icon so the host can see at a glance which questions are covered.", status: "live" },
      { icon: <MessageSquare className="w-4 h-4" />, name: "Author Grouping", detail: "Consecutive messages from the same viewer within 60s collapse into one block, so rapid chatters don't fill the panel.", status: "live" },
      { icon: <Bell className="w-4 h-4" />, name: "Join Pulses", detail: "Per-platform '+N new viewers' pills next to the header platform pills (Twitch + TikTok today — YouTube and Kick chat APIs don't expose viewer joins). Never as a toast, never spammy.", status: "live" },
      { icon: <MessageSquare className="w-4 h-4" />, name: "Donations & Events", detail: "Super Chats, Bits/Cheers, TikTok gifts, subscriptions, raids, and follows — all displayed inline.", status: "live" },
    ],
  },
  {
    id: "streaming",
    title: "Streaming",
    description: "Go live to multiple platforms simultaneously — and stay live when things go sideways.",
    features: [
      { icon: <Radio className="w-4 h-4" />, name: "Multi-Platform RTMP", detail: "Stream to YouTube, Twitch, Kick, and TikTok at the same time via LiveKit Egress. Cloud fan-out; host upload bandwidth doesn't scale with destinations.", status: "live" },
      { icon: <Radio className="w-4 h-4" />, name: "Custom RTMP", detail: "Add unlimited custom RTMP destinations — Facebook Live, LinkedIn, Restream, or your own server.", status: "live" },
      { icon: <CheckCircle2 className="w-4 h-4" />, name: "Pre-Flight Checklist", detail: "Before Go Live we flag mic-off / cam-off / poor network / YouTube-without-title. Non-blocking reminders, not a gate.", status: "live" },
      { icon: <BarChart2 className="w-4 h-4" />, name: "Live Viewer Counts", detail: "Concurrent viewer counts from YouTube, Twitch, and Kick rendered in the header pill (compact 1.2K / 12K / 1.1M) every 30 seconds.", status: "live" },
      { icon: <Radio className="w-4 h-4" />, name: "Stream-Health Badge", detail: "Live duration + platform list + network-quality dot anchored next to the participant count while streaming.", status: "live" },
      { icon: <RotateCcw className="w-4 h-4" />, name: "Per-Platform Reconnect", detail: "If one platform drops mid-stream, a pinned banner offers one-click Reconnect. Other destinations stay live.", status: "live" },
      { icon: <Link2 className="w-4 h-4" />, name: "Watch Links & QR", detail: "Click any platform pill to copy the viewer URL, open it in a new tab, or show a QR code for share-on-mobile.", status: "live" },
      { icon: <Radio className="w-4 h-4" />, name: "YouTube Backup URL", detail: "Automatic backup ingest URL support prevents 'duplicate ingestion' warnings on unstable connections.", status: "live" },
      { icon: <Camera className="w-4 h-4" />, name: "Stream Thumbnail", detail: "Set a custom thumbnail URL when creating your studio — uploaded to YouTube via the Data API when OAuth is connected.", status: "live" },
      { icon: <Video className="w-4 h-4" />, name: "Cloud Recording (R2)", detail: "Record your entire session to MP4 — audio, video, and screen captured via LiveKit Egress to Cloudflare R2.", status: "live" },
      { icon: <Shield className="w-4 h-4" />, name: "Persistent Critical Errors", detail: "Stream errors render as pinned banners (host must dismiss) instead of 5-second toasts. Never miss an egress crash.", status: "live" },
    ],
  },
  {
    id: "ai",
    title: "AI Co-Host (Gemini)",
    description: "An AI that reads your chat, replies in your voice, and never tries to be you.",
    features: [
      { icon: <Bot className="w-4 h-4" />, name: "Tone Matching", detail: "Train the AI on past chat logs or a one-paragraph persona brief. It replies in your style, never tries to clone your voice.", status: "live" },
      { icon: <MessageSquare className="w-4 h-4" />, name: "Host-Triggered Replies", detail: "AI only fires when you haven't answered a viewer question within your configured delay (5–60s). You can always override.", status: "live" },
      { icon: <Shield className="w-4 h-4" />, name: "Prompt-Injection Safe", detail: "All user input passes through stripHtml + Zod schema sanitization before reaching Gemini. Prompt injection attempts are stripped at the schema layer.", status: "live" },
      { icon: <FileText className="w-4 h-4" />, name: "Stream Summary", detail: "Auto-generated 3-paragraph recap of every stream, inserted on the public recap page and the session summary.", status: "coming-soon" },
      { icon: <Clock className="w-4 h-4" />, name: "Auto Chapter Markers", detail: "Split long streams into chapters based on chat density spikes and speaker shifts. Stored with the transcript.", status: "coming-soon" },
      { icon: <FileText className="w-4 h-4" />, name: "AI-Corrected Transcripts", detail: "Transcribe every stream and run a second Gemini pass for punctuation + speaker labels. Search transcripts across episodes.", status: "coming-soon" },
      { icon: <Volume2 className="w-4 h-4" />, name: "AI Voice Replies (TTS)", detail: "Optional voice synthesis so the co-host can speak its replies out loud. Off by default; you opt-in per session.", status: "coming-soon" },
      { icon: <Shield className="w-4 h-4" />, name: "Smart Moderation", detail: "Gemini's safety classifier auto-flags toxic chat; you get one-tap undo on every action.", status: "coming-soon" },
    ],
  },
  {
    id: "recap",
    title: "Recaps & Recording",
    description: "Every stream gets a sharable recap page and a downloadable recording.",
    features: [
      { icon: <Globe className="w-4 h-4" />, name: "Public Recap Page", detail: "/recap/[code] is a sharable, no-auth landing page with stats (duration, viewers, chat messages), platform list, and an acquisition CTA.", status: "live" },
      { icon: <BarChart2 className="w-4 h-4" />, name: "Host Session Summary", detail: "Private host summary with full stats, platform list, recording download link, and (soon) chapter markers.", status: "live" },
      { icon: <BarChart2 className="w-4 h-4" />, name: "Social Sharing", detail: "Share your session stats to X and LinkedIn with pre-filled text. Copy stats to clipboard.", status: "live" },
      { icon: <Video className="w-4 h-4" />, name: "Recording Playback", detail: "In-app player for cloud recordings with trim controls and per-clip share links. No re-encoding required.", status: "coming-soon" },
      { icon: <Scissors className="w-4 h-4" />, name: "Highlight Clips", detail: "Gemini scans your transcript for the 3 most engaging 30–60s segments and surfaces them on the session summary, ready to trim and export.", status: "coming-soon" },
      { icon: <Link2 className="w-4 h-4" />, name: "VOD Link Capture", detail: "After your stream ends, we fetch the published video URL from each platform (YouTube, Twitch, Kick) and pin it to your session record.", status: "coming-soon" },
    ],
  },
  {
    id: "shows",
    title: "Shows & Scheduling",
    description: "Spin up a one-off room — or run an entire series with saved defaults.",
    features: [
      { icon: <Save className="w-4 h-4" />, name: "Reusable Shows", detail: "Create a Show (or Series) that captures your defaults — title pattern, description template, thumbnail, platforms, AI persona — and groups every episode you ever run.", status: "coming-soon" },
      { icon: <LayoutGrid className="w-4 h-4" />, name: "Tabbed Create-Room UX", detail: "Three-step dialog (Basics · Platforms · AI co-host) with per-tab validation. Pick an existing Show to pre-fill the other tabs.", status: "coming-soon" },
      { icon: <Calendar className="w-4 h-4" />, name: "Stream Scheduling", detail: "Set a future start time and we build you a public /event/[code] landing page with countdown, share buttons, and Notify-me email capture. YouTube broadcasts are scheduled via the Data API.", status: "coming-soon" },
      { icon: <Mic className="w-4 h-4" />, name: "Test-Stream / Rehearsal Mode", detail: "Run your entire stack — egress, layouts, AI — without going live to any platform. Eliminates 'Go Live and pray'.", status: "coming-soon" },
      { icon: <LayoutGrid className="w-4 h-4" />, name: "Saved Layout Presets", detail: "Name a layout config (active layout + pinned participant + on-screen set) and recall it on the next episode.", status: "coming-soon" },
      { icon: <BarChart2 className="w-4 h-4" />, name: "Host Analytics", detail: "Per-show drill-down: total viewers over time, peak concurrent per platform, sessions per week, chat volume.", status: "coming-soon" },
    ],
  },
  {
    id: "engagement",
    title: "Engagement",
    description: "Pull your audience into the show — not just at it.",
    features: [
      { icon: <Pin className="w-4 h-4" />, name: "Pin Chat to Stage", detail: "Right-click any chat message to feature it as a TextOverlay on the broadcast. Auto-unpins after 30s by default.", status: "coming-soon" },
      { icon: <Smile className="w-4 h-4" />, name: "Emoji Reactions", detail: "Six-emoji reaction bar for guests. Reactions float up over the originating tile for two seconds.", status: "coming-soon" },
      { icon: <Captions className="w-4 h-4" />, name: "Live Captions", detail: "Browser-side captions via Web Speech API (option A), or low-latency server-side via Gemini live audio (option B). Toggle per session.", status: "coming-soon" },
      { icon: <Hand className="w-4 h-4" />, name: "Raise Hand", detail: "Guests signal interest without interrupting. Host sees a queue, brings them up in order.", status: "coming-soon" },
    ],
  },
  {
    id: "security",
    title: "Security & Reliability",
    description: "Production-grade hardening on every endpoint.",
    features: [
      { icon: <Shield className="w-4 h-4" />, name: "Rate Limiting", detail: "All 25+ mutation and polling endpoints protected by Upstash sliding window rate limits. 429 responses with Retry-After headers, fail-open on Redis outage.", status: "live" },
      { icon: <Shield className="w-4 h-4" />, name: "Input Sanitization", detail: "HTML stripped from all user-provided strings (names, messages, channels) via Zod transforms — XSS prevention at the schema layer.", status: "live" },
      { icon: <Shield className="w-4 h-4" />, name: "CSP Headers", detail: "Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and strict Referrer-Policy on all responses.", status: "live" },
      { icon: <Shield className="w-4 h-4" />, name: "Signed Webhooks", detail: "LiveKit egress webhooks verified via WebhookReceiver before any state mutation. Invalid signatures return 401.", status: "live" },
    ],
  },
]

const liveCount = categories.reduce((acc, c) => acc + c.features.filter((f) => f.status === "live").length, 0)
const comingSoonCount = categories.reduce((acc, c) => acc + c.features.filter((f) => f.status === "coming-soon").length, 0)

// ── Inline widgets ──────────────────────────────────────────────────────────

function StudioGridWidget() {
  // CSS-only mini layout: spotlight + 4 side tiles, mirrors the actual studio.
  return (
    <div className="relative w-full aspect-video rounded-xl bg-surface-1 border border-white/8 p-2 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,oklch(from_var(--color-brand)_l_c_h/0.18),transparent)]"
      />
      <div className="relative grid grid-cols-3 gap-1.5 h-full">
        <div className="col-span-2 rounded-lg bg-surface-2 border border-white/8 flex items-end p-2">
          <span className="text-[10px] font-medium text-ink-strong/90 bg-black/30 rounded px-1.5 py-0.5 backdrop-blur-sm">Host</span>
        </div>
        <div className="grid grid-rows-3 gap-1.5">
          <div className="rounded-md bg-surface-2 border border-white/8 flex items-end p-1">
            <span className="text-[8px] font-medium text-ink-strong/70 bg-black/30 rounded px-1">Guest 1</span>
          </div>
          <div className="rounded-md bg-surface-2 border border-white/8 flex items-end p-1">
            <span className="text-[8px] font-medium text-ink-strong/70 bg-black/30 rounded px-1">Guest 2</span>
          </div>
          <div className="rounded-md bg-surface-2 border border-dashed border-white/6 flex items-center justify-center">
            <span className="text-[8px] text-ink-subtle">Backstage</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 bg-danger/15 border border-danger/30 text-danger-text rounded-full px-2 py-0.5 text-[10px] font-semibold">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-danger animate-ping opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
        </span>
        LIVE · 24:18
      </div>
    </div>
  )
}

function ChatMockWidget() {
  return (
    <div className="w-full rounded-xl bg-surface-1 border border-white/8 p-3 space-y-2">
      <div className="flex items-center gap-2 pb-2 border-b border-white/8">
        <MessageSquare className="w-3.5 h-3.5 text-brand-soft" />
        <span className="text-xs font-semibold text-white">Live Chat</span>
        <span className="text-[10px] text-ink-subtle bg-white/6 px-1.5 py-0.5 rounded-full">312</span>
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex gap-2 px-2 py-1 border-l-2 border-l-danger/40">
          <span className="font-semibold text-danger-text">@yt_viewer</span>
          <span className="text-ink-emphasis">how long have you been streaming?</span>
        </div>
        <div className="flex gap-2 px-2 py-1 bg-brand/10 border-l-2 border-l-brand">
          <Bot className="w-3 h-3 text-brand-softer shrink-0 mt-0.5" />
          <span className="font-semibold text-brand-softer">AI Co-Host</span>
          <span className="text-ink-emphasis">Avi&apos;s been live for two years — he started early 2024.</span>
        </div>
        <div className="flex gap-2 px-2 py-1 border-l-2 border-l-accent-purple/40">
          <span className="font-semibold text-accent-violet-text">@twitch_chad</span>
          <span className="text-ink-emphasis">PogChamp</span>
        </div>
        <div className="flex gap-2 px-2 py-1 border-l-2 border-l-accent-purple/40">
          <span className="font-semibold text-accent-violet-text">@twitch_chad</span>
          <span className="text-ink-emphasis">love this layout</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 pt-2 border-t border-white/8">
        <span className="inline-flex items-center gap-1 bg-danger/10 border border-danger/30 rounded-full pl-1 pr-2 py-0.5 text-[10px] font-semibold text-danger-text">
          <UserPlus className="w-3 h-3" />
          +3
          <PlatformIcon platform="twitch" size={10} />
        </span>
        <span className="text-[10px] text-ink-subtle">new viewers · last 30s</span>
      </div>
    </div>
  )
}

function MultistreamWidget() {
  return (
    <div className="w-full rounded-xl bg-surface-1 border border-white/8 p-4 flex items-center justify-center min-h-[200px] relative overflow-hidden">
      <div className="text-brand-soft/30 absolute inset-0 flex items-center justify-center">
        <MultistreamFan width={360} />
      </div>
      <div className="relative grid grid-cols-2 gap-2 z-10">
        {(["youtube", "twitch", "kick", "tiktok"] as const).map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1.5 bg-surface-2 border border-white/10 rounded-full pl-1.5 pr-2.5 py-1"
          >
            <PlatformIcon platform={p} size={12} />
            <span className="text-[11px] font-medium text-ink-emphasis capitalize">{p}</span>
            <span className="text-[10px] font-semibold text-success-text tabular-nums">
              {{ youtube: "1.2K", twitch: "412", kick: "87", tiktok: "—" }[p]}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function RecapWidget() {
  return (
    <div className="w-full rounded-xl bg-surface-1 border border-white/8 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 bg-white/6 border border-white/10 text-ink-subtle rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle" />
          Recap
        </span>
        <span className="text-[10px] text-ink-subtle">Coding w/ Avi · Ep 14</span>
      </div>
      <p className="text-sm font-bold text-white leading-tight">
        Ran for <span className="text-brand-soft">42 min</span> on YouTube + Twitch.
      </p>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <Stat label="Viewers" value="1,612" />
        <Stat label="Messages" value="312" />
        <Stat label="Guests" value="3" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-white/8">
        <Sparkles className="w-3.5 h-3.5 text-brand-softer shrink-0" />
        <span className="text-[10px] text-ink-muted leading-snug">
          AI summary: <span className="text-ink-emphasis">Walked through the React 19 use() hook with two guest demos…</span>
        </span>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 border border-white/8 p-2">
      <div className="text-[9px] uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className="text-base font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}

// ── Marquee block ───────────────────────────────────────────────────────────

interface MarqueeProps {
  eyebrow: string
  title: string
  bullets: string[]
  href: string
  hrefLabel: string
  widget: React.ReactNode
  reverse?: boolean
}

function MarqueeBlock({ eyebrow, title, bullets, href, hrefLabel, widget, reverse }: MarqueeProps) {
  return (
    <section className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-violet-text mb-3">{eyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4">{title}</h2>
        <ul className="space-y-2 text-sm text-ink-muted mb-6">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-softer shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-violet-text hover:text-white transition-colors"
        >
          {hrefLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>{widget}</div>
    </section>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  const comingSoonByCategory = categories
    .map((c) => ({ ...c, features: c.features.filter((f) => f.status === "coming-soon") }))
    .filter((c) => c.features.length > 0)

  return (
    <div className="text-white">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <header className="relative pt-20 pb-12 px-6 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 top-8 flex justify-center -z-10 text-brand-soft/40 pointer-events-none"
        >
          <SignalArc width={1200} />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent-violet/10 text-accent-violet-text border border-accent-violet/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="font-semibold">{liveCount} live</span>
            <span className="text-accent-violet-text/40">·</span>
            <span>{comingSoonCount} on the roadmap</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4">
            One browser tab. <span className="text-accent-violet-text">Every platform.</span>
          </h1>
          <p className="text-lg text-ink-muted max-w-2xl mx-auto">
            Zerocast is a browser-based streaming studio with an AI co-host, live multistreaming
            to YouTube, Twitch, Kick, and TikTok, and a public recap page for every show.
            No downloads, no plugins, no second monitor.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="?beta=true"
              scroll={false}
              className="inline-flex items-center gap-2 bg-white text-ink-inverse font-bold px-7 py-3.5 rounded-full text-sm hover:bg-brand-on-light transition-all"
            >
              Join the Beta <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#catalogue"
              className="inline-flex items-center gap-2 text-ink-emphasis font-semibold px-6 py-3 rounded-full text-sm hover:text-white transition-colors"
            >
              See full feature list
            </Link>
          </div>
        </div>
      </header>

      {/* ── Marquee blocks ──────────────────────────────────────────────── */}
      <main className="relative">
        <div className="max-w-6xl mx-auto px-6 py-12 space-y-20">
          <MarqueeBlock
            eyebrow="Studio"
            title="Run a multi-cam live show from a single browser tab"
            bullets={[
              "Ten slot-based layouts — solo, spotlight, four/five/six-grid, plus dedicated screenshare presets.",
              "Show / Hide any participant in one click. Lower-third name bars scale automatically.",
              "Coach marks guide first-time hosts. Keyboard shortcuts (M, V, C) for the rest.",
            ]}
            href="#catalogue-studio"
            hrefLabel="All studio features"
            widget={<StudioGridWidget />}
          />

          <MarqueeBlock
            reverse
            eyebrow="AI Co-Host"
            title="An assistant that reads your chat and replies in your voice"
            bullets={[
              "Tone Matching from past chat logs or a one-paragraph persona brief.",
              "Only fires when you haven't answered within your delay (5–60s). You always override.",
              "Coming soon: auto stream summaries, chapter markers, AI-corrected transcripts.",
            ]}
            href="/features/ai-cohost"
            hrefLabel="How Tone Matching works"
            widget={<ChatMockWidget />}
          />

          <MarqueeBlock
            eyebrow="Multistream"
            title="Stream live to YouTube, Twitch, Kick, and TikTok at once"
            bullets={[
              "Cloud RTMP fan-out via LiveKit Egress — your upload bandwidth doesn't scale with platforms.",
              "Live viewer counts pulled from each platform every 30s and rendered in the studio header.",
              "If one platform drops, a pinned banner offers one-click Reconnect. Others stay live.",
            ]}
            href="/integrations"
            hrefLabel="Platform integrations"
            widget={<MultistreamWidget />}
          />

          <MarqueeBlock
            reverse
            eyebrow="Recap & Recording"
            title="Every stream gets a sharable recap page and a cloud recording"
            bullets={[
              "Public /recap/[code] landing page — stats, platform list, anon → sign-up CTA. No auth required.",
              "Cloud recording to Cloudflare R2 — playback + trim + share coming next.",
              "VOD link capture across YouTube, Twitch, and Kick lets you pin the published video to your session record.",
            ]}
            href="#catalogue-recap"
            hrefLabel="See recap features"
            widget={<RecapWidget />}
          />
        </div>
      </main>

      {/* ── Full catalogue ───────────────────────────────────────────────── */}
      <section id="catalogue" className="px-6 py-16 border-t border-white/5 bg-surface-1/40">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-violet-text mb-3">Catalogue</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">Everything else</h2>
            <p className="text-ink-muted text-sm max-w-xl mx-auto">
              The full feature set, grouped by category. Coming-soon items are on the roadmap and tagged.
            </p>
          </div>
          <div className="space-y-14">
            {categories.map((category) => (
              <section key={category.id} id={`catalogue-${category.id}`}>
                <div className="mb-5">
                  <h3 className="text-xl font-bold text-white mb-1">{category.title}</h3>
                  <p className="text-ink-subtle text-sm">{category.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.features.map((feature) => (
                    <div
                      key={feature.name}
                      className={[
                        "bg-surface-2 border rounded-xl p-5 transition-colors",
                        feature.status === "live"
                          ? "border-white/6 hover:border-white/12"
                          : "border-dashed border-white/10",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            feature.status === "live"
                              ? "bg-accent-violet/10 text-accent-violet-text"
                              : "bg-warn/10 text-warn-text",
                          ].join(" ")}
                        >
                          {feature.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-white font-medium text-sm">{feature.name}</h4>
                            {feature.status === "coming-soon" && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warn/10 text-warn-text border border-warn/20 whitespace-nowrap">
                                Coming Soon
                              </span>
                            )}
                          </div>
                          <p className="text-ink-subtle text-xs leading-relaxed">{feature.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coming-soon roadmap teaser ───────────────────────────────────── */}
      {comingSoonByCategory.length > 0 && (
        <section className="px-6 py-16 border-t border-white/5 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 flex items-center justify-center text-brand-soft/15 pointer-events-none"
          >
            <PulseRing size={520} />
          </div>
          <div className="max-w-4xl mx-auto text-center mb-12 relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-warn-text mb-3">Roadmap</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              {comingSoonCount} features on the way
            </h2>
            <p className="text-ink-muted text-sm max-w-xl mx-auto">
              We&apos;re building in the open. Beta users get early access to everything below — and shape what ships next.
            </p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative">
            {comingSoonByCategory.flatMap((cat) =>
              cat.features.map((feature) => (
                <div
                  key={`${cat.id}-${feature.name}`}
                  className="bg-surface-2/50 border border-dashed border-warn/20 rounded-xl p-5 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-warn/10 text-warn-text flex items-center justify-center shrink-0">
                      {feature.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium text-sm">{feature.name}</h4>
                      </div>
                      <p className="text-ink-subtle text-xs leading-relaxed mb-2">{feature.detail}</p>
                      <span className="text-[10px] uppercase tracking-wider text-warn-text/70">{cat.title}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-black text-white text-4xl tracking-tight">Ready to try it?</h2>
            <p className="text-ink-muted text-sm mt-2 max-w-md">
              Beta is free while we&apos;re still shipping. Join now and you&apos;ll see new features
              the day they go out.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="?beta=true"
              scroll={false}
              className="inline-flex items-center gap-2 bg-white text-ink-inverse font-bold px-8 py-4 rounded-full text-sm hover:bg-brand-on-light transition-all"
            >
              Join the Beta <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-ink-emphasis font-semibold px-6 py-3 rounded-full text-sm hover:text-white transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
