import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog | Zerocast",
  description: "What's new in Zerocast — features, fixes, and improvements.",
};

type Tag = "feat" | "fix" | "improvement" | "security";

interface ChangeItem {
  tag: Tag;
  text: string;
}

interface ChangelogEntry {
  date: string;
  version: string;
  title: string;
  changes: ChangeItem[];
}

const tagStyles: Record<Tag, string> = {
  feat: "text-brand-soft border-brand/20 bg-brand/5",
  fix: "text-warn-text border-warn/20 bg-warn/5",
  improvement: "text-accent-blue border-accent-blue/20 bg-accent-blue/5",
  security: "text-danger-text border-danger/20 bg-danger/5",
};

const entries: ChangelogEntry[] = [
  {
    date: "May 13, 2026",
    version: "v2.5.0",
    title: "Studio UX Overhaul — Phases Φ0 → Φ7 + Feature Backlog",
    changes: [
      // Φ0 — brand + token foundation
      { tag: "improvement", text: "Brand unified on indigo across the webapp (studio, dashboard, join, demo, login, settings, session-summary, status, feedback, qa) — 31-file violet → indigo sweep. Marketing scope intentionally untouched." },
      { tag: "improvement", text: "Studio surface tokens added to @theme inline — --color-studio-bg / -bg-deep / -panel / -elevated. ~50 hardcoded hex usages across studio components now reference tokens for one-line theming." },

      // Φ1 — foundation polish
      { tag: "feat", text: "StudioCoachMarks — progressive disclosure host coach marks for first-run hosts. One tip at a time: invite a guest → connect a platform → go live. Each tip auto-resolves on action; dismiss persists in localStorage." },
      { tag: "feat", text: "Inline Spinner primitive (currentColor arc, three sizes, motion-reduce fallback). Adopted across GoLivePanel + JoinClient request-to-join." },
      { tag: "improvement", text: "Studio skeleton matches real frame (toolbar + 16:9 stage + backstage strip + 5-slot control bar + chat shimmer) — reduces CLS on first paint." },
      { tag: "improvement", text: "Backstage empty state is now an actionable Copy invite link pill with clipboard + toast feedback." },
      { tag: "improvement", text: "ControlBar pb honors env(safe-area-inset-bottom) — iOS home indicator no longer eats mic/cam controls." },
      { tag: "improvement", text: "PlatformFilter pill hit target bumped past mobile floor (text-[9px] px-1.5 → text-[10px] px-2 min-h-7)." },

      // Φ2 — host live flow
      { tag: "feat", text: "Studio notification tones (Web Audio synth, no asset) — guest-join two-note rise, stream-live triple-blip, stream-error two-note fall. Toggleable in Settings. Desktop Notification API fallback when tab is hidden." },
      { tag: "feat", text: "Pre-flight checklist inline in Go Live dialog — flags mic-off / cam-off / poor network / YouTube-without-title. Non-blocking reminder, not a gate." },
      { tag: "feat", text: "StreamHealthBadge — live duration + platform label + network-quality dot anchored next to participant count while streaming." },
      { tag: "feat", text: "ErrorBannerStack — pinned, dismissible critical-error banners (role=alert, aria-live=assertive) replace the 5-second STREAM_ERROR toast. Stays until host acknowledges." },
      { tag: "improvement", text: "Go Live trigger button visually elevated (h-9, min-w-[88px], stronger shadow + ring offset) so it's the dominant action in the toolbar." },

      // Φ3 — stage management
      { tag: "improvement", text: "ParticipantRow Stage / Backstage labels (action + place naming, ambiguous) renamed to Show / Hide with matching aria-labels. Bigger touch targets — mic / cam / kick icons p-1 → p-1.5, stage toggle min-h 26px min-w 68px." },
      { tag: "feat", text: "Guest off-stage coaching banner — when the host has limited the on-screen set and the local guest is not in it, a small indigo pill explains the host hasn't put them on stage yet. LayoutBroadcaster widened with onScreenParticipantIds so guests can react without a round-trip." },

      // Φ4 — chat
      { tag: "feat", text: "Multi-line chat input (textarea, Shift+Enter newline, IME-aware). Resize-y up to max-h-32. Placeholder shows the shortcut." },
      { tag: "improvement", text: "Chat message grouping by author — consecutive same-author plain-text messages within 60s collapse their header, reducing visual noise from rapid-fire viewers." },
      { tag: "improvement", text: "AI assistant messages now get a permanent indigo background tint, solid platform-color left border, and a bot icon next to the author label — the host sees at a glance which questions the assistant has handled." },

      // Φ5 — guest pre-join + studio a11y
      { tag: "feat", text: "Guest waiting state shows live elapsed counter (Waiting · 0:32) plus a Cancel request link that closes the SSE connection." },
      { tag: "feat", text: "SSE failure during waiting state surfaces a Retry button next to the yellow notice — force-rebuilds the EventSource via sseRetryNonce dep." },
      { tag: "improvement", text: "GuestStudio mic / cam / screenshare toggles gain aria-pressed + descriptive aria-labels (state + click action). DeviceSelector visible on all viewports — mobile guests can swap their camera mid-call." },
      { tag: "improvement", text: "Connection-monitor modals now expose role=alertdialog aria-modal=true. The non-blocking Connecting overlay uses role=status aria-live=polite." },

      // Φ6 — a11y cross-cutting
      { tag: "feat", text: "Studio keyboard shortcuts — M toggles microphone, V toggles camera, C toggles chat sidebar (desktop collapse / mobile open), ? opens a shortcuts help dialog, Esc closes. Ignored while typing in any input. Sonner toast confirms each mic/cam state change." },
      { tag: "improvement", text: "Every bare animate-pulse / animate-ping / animate-spin / animate-bounce across StudioClient, GuestStudio, JoinClient, and the studio skeleton swept to motion-safe:animate-* so prefers-reduced-motion users get a steady visual." },

      // Φ7 — polish
      { tag: "feat", text: "useVisualViewport hook + keyboard-aware StartAudio — the fixed Click-to-enable-audio button now lifts above the on-screen keyboard on mobile Safari / Chrome instead of being trapped behind it." },
      { tag: "feat", text: "Sound alerts toggle (role=switch) in TopToolbar Settings — host can mute studio notification tones without DevTools / localStorage hand-editing." },
      { tag: "feat", text: "Mute all guests quick action in TopToolbar Settings — iterates useParticipants(), POSTs /mute for every non-host with mic on, toasts a count summary." },

      // F-25 — End vs Pause
      { tag: "feat", text: "End / Pause split for studio session — Pause (default, recommended) stops the live stream, dismisses guests, leaves Room.status = LOBBY so the host can return via the same room code; End permanently closes the room. POST /api/rooms/[code]/pause + new STUDIO_PAUSED SSE event + /studio-paused interstitial." },

      // F-23 — Platform pills + watch links
      { tag: "feat", text: "Click any platform pill in the studio header — popover with Copy watch link / Open in new tab / Show QR code. Resolver fetches the exact YouTube broadcast URL via OAuth, falls back to channel /live for stream-key only / Twitch / Kick / TikTok. URLs cached in Redis room:<code>:public_urls and refreshed on destination add/remove." },
      { tag: "feat", text: "QR code modal for any platform viewer link (qrcode.react, SVG, 208×208, white bg for camera contrast) — share the live URL to viewers on mobile without retyping." },

      // F-26 — Public recap
      { tag: "feat", text: "Public session recap at /recap/[code] — sharable, no auth required. Hero stat (duration + platforms), three stat cards (duration / people / chat messages), platform pill row, and an acquisition CTA branched on auth state (anon → Create your studio sign-up; authed → Open dashboard)." },
      { tag: "improvement", text: "Guest STUDIO_ENDED redirects + /join/[code] ended-state now route to /recap/[code] instead of the generic /studio-ended interstitial — late-arriving viewers land on the recap. Host's private /session-summary/[code] (recording URL + raw stats) unchanged." },

      // a11y / cleanup
      { tag: "improvement", text: "Focus rings, aria-labels, and aria-pressed sweep across ControlBar, TopToolbar ToolBtns, ParticipantRow moderation buttons, VideoTile on-screen toggle, mobile chat toggle, chat collapse badge, TextOverlay color swatches, LayoutSelector (radiogroup + radio), AudioLevelBar (role=meter), PlatformFilter pills, GuestRequestToast." },
      { tag: "improvement", text: "Mobile UX: header pt env(safe-area-inset-top), chat overlay tap-to-close backdrop on mobile, mobile-aware unread badge widened via matchMedia, LayoutSelector visible on mobile (was hidden sm:flex), DeviceSelector dropdown capped at 60vh." },
      { tag: "fix", text: "VideoTile speaking-state ring jitter eliminated — constant ring-2 with a color-only transition (was flipping ring-2 ↔ ring-1 every speech start/stop)." },
      { tag: "fix", text: "ConnectionMonitor overlay z-50 (was z-20, hidden behind mobile chat sidebar at z-30 — host couldn't see a connection-lost screen while chat was open)." },
    ],
  },
  {
    date: "May 13, 2026",
    version: "v2.4.0",
    title: "Marketing Design System, Admin Console & Observability",
    changes: [
      // Marketing design system
      { tag: "feat", text: "Semantic color tokens — surface / ink / brand / accent / status — registered in globals.css @theme inline so Tailwind v4 auto-generates utilities (oklch base, /alpha modifier works)" },
      { tag: "feat", text: "Signal Static design philosophy + full styleguide (docs/styleguide.md, docs/design/philosophy.md) — invariants, token catalog, usage patterns, forbidden patterns, add-a-token instructions" },
      { tag: "improvement", text: "Every marketing page + MarketingNav + Footer + FaqSection + AnimatedChatWidget + BetaModal + components/seo/* migrated from hardcoded hex / palette-direct classes to semantic tokens" },

      // Marketing assets
      { tag: "feat", text: "/og/marketing dynamic image generator — 6 content scenes (hero, multistream, ai-cohost, browser, beta, quote) × 5 variants (square 1080², og 1200×630, story 1080×1920, banner 1500×500, portrait 1080×1350) rendered on demand via @vercel/og with per-scene foreground graphics, brand glow, scanline whisper, hairline frame" },
      { tag: "feat", text: "Inline SVG illustration components (PulseRing, MultistreamFan, SignalArc) — token-driven via currentColor" },
      { tag: "improvement", text: "SignalArc embedded as low-opacity backdrop behind /features hero" },

      // Admin console
      { tag: "feat", text: "/adminos sign-in entrypoint — dev test signin + Google + Resend magic link, redirects to /admin on success, shows forbidden panel for non-admin sessions" },
      { tag: "feat", text: "/admin operations console — gated layout via requireAdmin(), top nav (Overview, Beta Requests, Errors, Marketing Kit), sign-out, current-admin badge" },
      { tag: "feat", text: "/admin/marketing-kit — generates social cards via /og/marketing, illustration showcase, campaign concept scaffolding for future asset ideas (Product Hunt kit, email headers, Lottie reel, podcast covers, X teaser, overlay templates, community pack, sticker pack, conference backdrop, in-app empty states)" },
      { tag: "improvement", text: "Centralized admin allow-list at src/lib/admin.ts (requireAdmin / isAdminEmail) — replaces ad-hoc ADMIN_EMAILS Sets in individual routes" },

      // Observability
      { tag: "feat", text: "Homegrown error reporter — ErrorBeacon (client window.error + unhandledrejection, keepalive POST) + instrumentation.ts onRequestError hook (server App Router + actions + middleware) → Redis ring buffer errors:recent capped at 200 → /admin/errors viewer with grouped Top Messages + expandable Recent Feed" },
      { tag: "feat", text: "/api/errors ingest endpoint — Zod-validated, stripHtml-sanitized, rate-limited via errors:ingest limiter (30/min/IP), fail-open" },

      // Fixes
      { tag: "fix", text: "Studio rehydration crash — guard CompositeStage + studio store against stale activeLayout id from older Redis snapshots (preset.slots of undefined regression). Two-layer defense: fallback to four-grid at compositor + reject unknown ids at hydrateFromSaved." },
    ],
  },
  {
    date: "May 13, 2026",
    version: "v2.3.0",
    title: "Studio Layout Rewrite + Recording to R2 (Composite Egress Template)",
    changes: [
      { tag: "feat", text: "Fixed 1920×1080 virtual canvas for the studio stage — CSS container queries + transform:scale fit any viewport while preserving exact pixel coordinates" },
      { tag: "feat", text: "10 slot-based layout presets (solo, two-side, three-row, four/five/six-grid, two spotlight variants, two screen-share variants) replace CSS-grid responsive reflow" },
      { tag: "feat", text: "Slot resolver in CompositeStage — pinned > host-* > tileOrder, screenshare → dedicated slot if preset defines one" },
      { tag: "feat", text: "Drag-to-reorder participants in backstage strip via @dnd-kit (pointer + keyboard sensors) — order persists in tileOrder and propagates to the composite egress" },
      { tag: "feat", text: "Cloud recording to Cloudflare R2 (S3-compatible, free egress) — EncodedFileOutput.s3 with R2 creds, 1080p30 encoding" },
      { tag: "feat", text: "Custom composite egress template at /composite/[code] — public LK subscriber renders the same CompositeStage as the host preview, so recording and RTMP match viewer-side pixel-for-pixel" },
      { tag: "feat", text: "Session summary now shows a Download recording button with 24h presigned URL refresh on stale links" },
      { tag: "improvement", text: "LayoutBroadcaster widened with tileOrder + onScreenParticipantIds; rebroadcasts on participant join so late subscribers (composite egress workers) get full state without waiting" },
      { tag: "improvement", text: "RTMP live egress (Go Live to YouTube/Twitch/Kick/TikTok) now also uses the custom composite template — drops LiveKit's built-in grid template" },
      { tag: "improvement", text: "StreamSession schema extended with recordingPath + recordingUrl; record route persists the row on start and updates on stop" },
      { tag: "fix", text: "Studio 'Something went wrong' crash on entry — useConnectionQualityIndicator() now passes localParticipant explicitly (LK components-react v2.9.20 throws when no ParticipantContext exists)" },
      { tag: "fix", text: "Recording start/stop error logs include HTTP status code for easier debugging" },
      { tag: "fix", text: "Migration drift recovery — schema synced via prisma db push (matches existing prod build flow)" },
    ],
  },
  {
    date: "May 13, 2026",
    version: "v2.2.0",
    title: "SEO Foundation Phase 1 — AI Bot Allowlist, llms.txt Spec, Real Sitemap Lastmod",
    changes: [
      { tag: "feat", text: "AI crawler allowlist in robots.ts — 15 bots explicitly permitted (GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, cohere-ai, Applebot-Extended, Bytespider, meta-externalagent, Diffbot, FacebookBot) to maximize AI Overview / ChatGPT / Perplexity citation eligibility" },
      { tag: "feat", text: "/llms.txt now follows the full llmstxt.org spec — structured H1/H2 site map for LLM ingestion (replaces old /llm.txt singular)" },
      { tag: "feat", text: "/llms-full.txt — 5,400-word content corpus covering features, pricing, comparisons, use cases, glossary, FAQ, platforms — one-shot LLM ingestion file" },
      { tag: "improvement", text: "sitemap.xml now reports real per-route lastModified via git mtime, with fs.stat and now() fallback chain — Google can prioritize freshly-updated content" },
      { tag: "security", text: "/admin and /api/admin added to robots disallow list across all crawlers" },
    ],
  },
  {
    date: "May 11, 2026",
    version: "v2.1.0",
    title: "Marketing Site Overhaul & Beta Infrastructure",
    changes: [
      { tag: "feat", text: "Global BetaModal system triggered via ?beta=true query param across the entire app" },
      { tag: "feat", text: "BetaRequest database schema and API endpoint with 409 duplicate-email handling" },
      { tag: "improvement", text: "Complete marketing site redesign (NexProve product) — editorial layouts, oversized typography, no generic cards" },
      { tag: "improvement", text: "Global MarketingNav and Footer with full sitemap integration" },
      { tag: "improvement", text: "Expanded comparison table matrix (StreamYard, Restream, MelonApp, Zerocast)" },
    ],
  },
  {
    date: "May 4, 2026",
    version: "v2.0.0",
    title: "Phase 4 Hardening — Rate Limiting & Input Sanitization",
    changes: [
      { tag: "security", text: "Rate limiting on all 22 mutation/polling API endpoints via Upstash sliding window — generous limits (30/min host actions, 60/min polling, 5/min unauthenticated)" },
      { tag: "security", text: "HTML sanitization (stripHtml) on all user-provided strings — guest names, chat messages, channel names, RTMP destination names, feedback fields" },
      { tag: "security", text: "Zod .transform() sanitization — XSS prevention happens at schema validation time, before data reaches any handler" },
      { tag: "feat", text: "rateLimitGuard() helper — single-line rate limit check returning 429 with Retry-After header, fail-open on Redis errors" },
      { tag: "feat", text: "Feedback endpoint rewritten with Zod schema validation replacing manual parsing" },
      { tag: "improvement", text: "All rate-limited endpoints return standard headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After" },
      { tag: "improvement", text: "CSP headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options) already in place from v1.9" },
    ],
  },
  {
    date: "May 4, 2026",
    version: "v1.9.0",
    title: "Architecture Migration — SSE to LiveKit Data Channels",
    changes: [
      { tag: "feat", text: "SSE replaced with LiveKit data channels for host-to-guest event relay — lower latency, fewer open connections" },
      { tag: "feat", text: "Auto-layout switching — layout adapts automatically based on participant count and screen shares" },
      { tag: "feat", text: "AI chat responder — Gemini-powered auto-reply to viewer questions in chat (host-triggered)" },
      { tag: "feat", text: "Docker Compose local development — full stack (Postgres, Redis, LiveKit) with one command" },
      { tag: "feat", text: "RoomEventRelay component — host polls events-since endpoint and relays to guests via data channels" },
      { tag: "improvement", text: "70 new tests covering extended features (184 total)" },
      { tag: "security", text: "Security audit fixes from v1.8.0 review" },
    ],
  },
  {
    date: "Apr 29, 2026",
    version: "v1.8.0",
    title: "Guest Overhaul, UI Declutter, Chat Overlay & Reconnection",
    changes: [
      { tag: "feat", text: "Guest backstage panel — see all participants with role badges, mic/camera status, and speaking indicators (no moderation controls)" },
      { tag: "feat", text: "Guest chat input — guests can now type messages in chat, shown with teal 'Guest' badge" },
      { tag: "feat", text: "Guest screen sharing — dedicated screen share toggle button in guest control bar" },
      { tag: "feat", text: "Copy room link button for guests in header bar" },
      { tag: "feat", text: "TopToolbar — GoLive, Layout, Text, Invite, Settings, End moved above the stage; bottom bar is now just media controls" },
      { tag: "feat", text: "Twitch-style chat overlay on canvas — last 4 messages with auto-fade, configurable position (4 corners)" },
      { tag: "feat", text: "Text overlay timer — set duration in seconds, auto-hides when expired, shows countdown badge" },
      { tag: "feat", text: "Network quality indicator — signal strength icon (green/yellow/red) for host and guest" },
      { tag: "fix", text: "Canvas now centered with max-width 1280px and 16:9 aspect ratio — no more blank space when streaming" },
      { tag: "fix", text: "Connection timeouts — adaptive streaming, dynacast, custom reconnect policy (5 attempts, exponential backoff)" },
      { tag: "fix", text: "ConnectionMonitor shows attempt count, elapsed time, and refresh button after 5 failed attempts" },
      { tag: "improvement", text: "Control bar decluttered — only essential media controls on mobile; everything else in TopToolbar" },
    ],
  },
  {
    date: "Apr 29, 2026",
    version: "v1.7.0",
    title: "End Studio Dialog, Recording & Text Overlays",
    changes: [
      { tag: "feat", text: "Configurable end-studio dialog — checkboxes for stop streams, kick participants, with live platform warning" },
      { tag: "feat", text: "Session recording — Record button captures audio + video via LiveKit Egress to MP4 with elapsed timer" },
      { tag: "feat", text: "Text overlays — add text to the stage with 6 positions, 3 font sizes, custom colors and backgrounds" },
      { tag: "feat", text: "Stage background color — change the canvas background from a palette of dark-theme presets" },
      { tag: "feat", text: "Overlays and background sync to guests in real time via LiveKit data messages" },
      { tag: "improvement", text: "End studio stops active streams and kicks participants conditionally based on host selection" },
      { tag: "improvement", text: "Record button shows pulsing red dot with MM:SS elapsed timer while recording" },
    ],
  },
  {
    date: "Apr 29, 2026",
    version: "v1.6.0",
    title: "Layout Sync, Kick Notifications & YouTube Metadata",
    changes: [
      { tag: "feat", text: "Guest layout sync — guests now see the same layout preset the host selects (Grid, Spotlight, Screen+Grid, etc.) via LiveKit data messages" },
      { tag: "feat", text: "Kick notification — removed guests see a clear 'You were removed' screen with a 'Request to Rejoin' button" },
      { tag: "feat", text: "YouTube broadcast metadata — title, description, and thumbnail sent via YouTube Data API v3 when OAuth token is available" },
      { tag: "feat", text: "Thumbnail URL field in Create Studio modal for YouTube broadcasts" },
      { tag: "fix", text: "Host toast now says 'was removed' when kicking vs 'left the studio' when guest leaves voluntarily" },
      { tag: "improvement", text: "GoLivePanel shows per-platform OAuth status — auto metadata vs manual YouTube Studio link" },
      { tag: "improvement", text: "Kicked guest rejoin flow re-enters device preview with same name and email" },
    ],
  },
  {
    date: "Apr 29, 2026",
    version: "v1.5.0",
    title: "Chat Polish, Host Echo & Responsive UI",
    changes: [
      { tag: "feat", text: "Chat filter shows only connected platforms with real SVG logos and green ring indicator" },
      { tag: "feat", text: "Host-sent messages appear in chat window instantly with violet 'You' badge, broadcast to guests via SSE" },
      { tag: "feat", text: "YouTube backup ingest URL support — prevents 'duplicate ingestion' warnings on poor network" },
      { tag: "feat", text: "Collapsible chat panel on all screen sizes — floating badge with unread message count" },
      { tag: "feat", text: "Backup Server URL field in YouTube platform settings" },
      { tag: "fix", text: "Control bar (GoLive, End) always visible — no longer hidden behind chat on small screens" },
      { tag: "fix", text: "LayoutSelector hidden on mobile to free space for essential controls" },
      { tag: "improvement", text: "Guest studio gets chat toggle, collapsible panel, and unread badge matching host experience" },
    ],
  },
  {
    date: "Apr 28, 2026",
    version: "v1.4.0",
    title: "Audio Reliability & VU Meters",
    changes: [
      { tag: "feat", text: "Audio level indicator (VU meter) — real-time mic level bars for host and guest, powered by Web Audio AnalyserNode" },
      { tag: "feat", text: "Mic level preview on guest join screen — speak to verify your microphone before entering the studio" },
      { tag: "feat", text: "Guest device selector — guests can now pick camera, microphone, and speaker (previously host-only)" },
      { tag: "fix", text: "Preview-to-room mic handoff — 600ms release guard prevents browser mic conflict when transitioning from device preview to LiveKit room" },
      { tag: "fix", text: "LiveKit room now defers connect until preview tracks are fully released (connect={previewReleased})" },
      { tag: "improvement", text: "Audio architecture matches StreamYard/Google Meet SFU model — RoomAudioRenderer creates hidden audio elements per remote participant" },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="text-white selection:bg-brand/30">

      {/* Header */}
      <section className="px-6 pt-24 pb-16 max-w-7xl mx-auto border-b border-white/5">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-8">Changelog</p>
        <h1 className="font-black text-white tracking-tight leading-[0.95] mb-4"
          style={{ fontSize: "clamp(48px, 7vw, 96px)" }}>
          What&apos;s new.
        </h1>
        <p className="text-ink-subtle text-lg">Features, fixes, and improvements.</p>
      </section>

      {/* Entries */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <div className="max-w-4xl space-y-24">
          {entries.map((entry) => (
            <div key={entry.version} className="relative">
              
              <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                {/* Meta column */}
                <div className="md:w-48 shrink-0 border-l-2 border-brand/30 pl-4 py-1">
                  <span className="block text-sm font-bold text-white mb-1">{entry.version}</span>
                  <span className="block text-xs font-bold uppercase tracking-wider text-ink-subtle">{entry.date}</span>
                </div>

                {/* Content column */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-8">{entry.title}</h2>
                  <div className="space-y-6">
                    {entry.changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-4 pb-6 border-b border-white/5 last:border-0 last:pb-0">
                        <span className={`shrink-0 mt-0.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${tagStyles[change.tag]}`}>
                          {change.tag}
                        </span>
                        <p className="text-ink-muted text-sm leading-relaxed">{change.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 px-6 py-20 bg-surface-1/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <h2 className="font-black text-white text-3xl tracking-tight">Got a feature request?</h2>
          <Link href="/contact" className="shrink-0 inline-flex items-center gap-2 text-ink-muted hover:text-white transition-colors text-sm font-bold">
            Let us know <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
}
