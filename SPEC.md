# SPEC

Caveman-encoded invariants. Edit when adding/changing load-bearing behavior. Read before coding.

## §I — Interfaces

```
env: DATABASE_URL ! set, append `connection_limit=1` for serverless
env: DIRECT_URL ! set, bypasses Neon pooler, used by `prisma migrate deploy`
env: NEXT_PUBLIC_LIVEKIT_URL ! `wss://` (browser) → server SDK rewrites to `https://`
env: LIVEKIT_API_KEY & LIVEKIT_API_SECRET ! both set or token mint fails silent
env: UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN ! set, fail-open if absent
env: NEXTAUTH_SECRET ! ≥32 chars, JWT strategy
env: GEMINI_API_KEY ? absent → AI chat disabled server-side
env: NEXT_PUBLIC_SITE_URL ? fallback `https://zerocast.vercel.app`

api: POST /api/rooms → 201 {code,token} | 401 | 429
api: POST /api/rooms/[code]/{admit,deny,kick,mute,end,leave,record,stream-live}
api: GET  /api/rooms/[code]/stream → SSE event bus (legacy; v1.9 migrated→LiveKit data channels)
api: POST /api/rooms/[code]/chat/{connect,send,guest-send,ai-respond}
api: GET  /api/rooms/[code]/state | PUT same
api: POST /api/beta → 201 | 409 dup | 429
api: GET  /api/status → JSON health (DB, Redis, LiveKit)
api: ∀ mutating routes → auth() ! && rate-limit guard

identity: `host-<userId>`     ∀ host
identity: `guest-<guestId>`   ∀ guest
∴ mute/kick/sendData target these strings exact

livekit-room: emptyTimeout=300s, maxParticipants=6 (1 host + 5 guests)
livekit-sdk: `toJwt()` async @ v2.x → ! await
```

## §V — Invariants

```
V1:  NextAuth session strategy = "jwt" ! ⊥ "database"
     Why: Edge middleware (src/middleware.ts) ⊥ Prisma → DB sessions → ∞ redirect /login.

V2:  ∀ Prisma op → retry on {P1001,P1002,P1008,P1017} & "Can't reach database server"
     Max attempts: 3, base delay 500ms, exp backoff. See src/lib/prisma.ts.

V3:  ∀ Upstash rate limit → fail-open on Redis error
     Why: Redis outage ⊥ block legit users. See checkRateLimit() try/catch.

V4:  ∀ user-input string → sanitize via stripHtml() in Zod transform
     ! at schema boundary, ⊥ in handlers. See src/lib/sanitize.ts + src/lib/schemas/.

V5:  ∀ Redis key on room scope → sadd → `room:<code>:_keys`
     Why: deleteRoomKeys() needs Set membership for cleanup on room end.

V6:  PlatformType enum upper-case in DB
     ∀ user input → `.toUpperCase()` before insert. {YOUTUBE,TWITCH,KICK,TIKTOK}.

V7:  ∀ <Link href="?beta=true"> → ! scroll={false}
     Why: default Next.js Link scroll-to-top on nav → kills modal UX (beta modal opens via query param).

V8:  ∀ marketing CTA / nav / footer → live under src/app/(marketing)/
     Route group → bypasses authed layout.

V9:  ∀ Prisma DATABASE_URL → ?connection_limit=1 appended (serverless)
     ⊥ strip. Vercel functions ⊥ open > 1 conn per invocation.

V10: ∀ Page route w/ params @ Next 15 → params: Promise<…> + await
     Old API: `params: {…}` typed object broke build at type-check.

V11: ∀ Page metadata → `metadataBase` set (root layout) for OG/Twitter URLs
     Relative URLs ⊥ work on Twitter/LinkedIn preview without metadataBase.

V12: ∀ public marketing page → `export const metadata` w/ `alternates.canonical`
     ⊥ omit → duplicate-content risk.

V13: ∀ JSON-LD <script type="application/ld+json"> → real data only
     ⊥ fake aggregateRating, ⊥ fake reviewCount → Google manual action risk.

V14: ∀ failing 3rd-party component on marketing → wrap <SafeBoundary>
     Why: one widget crash ⊥ kill page. See src/components/SafeBoundary.tsx.

V15: studio composite canvas = 1920×1080 logical px. Preview = transform:scale fit; egress = native render.
     ∀ slot coord ∈ src/lib/layout/presets.ts → % of canvas. ⊥ raw px on slots.
     Why: single renderer drives host preview + (future) egress composite → pixel-identical output.

V16: ∀ stage tile placement → slot resolver in CompositeStage:
       pinnedParticipantId → slot 0
       else host-* identity → slot 0
       else tileOrder[0] → slot 0
       remaining cameras fill via tileOrder, then natural connect order
       screenshare → preset.screenshareSlot if defined
     ⊥ CSS grid reflow. ⊥ flex-N layout branches.

V17: ∀ useConnectionQualityIndicator() (LK components-react v2.9.x) → ! pass {participant: localParticipant}
     Why: no-arg call → useEnsureParticipant throws "No participant provided" outside ParticipantContext.
     See B7.

V18: ∀ LK egress (RTMP & recording) → customBaseUrl = `${SITE_URL}/composite/${roomCode}`
     ⊥ built-in `layout: "grid"` template. Why: built-in ignores our custom layout, overlays, tile order — host preview ≠ viewer composite. /composite/[code] is public, validates egress-issued JWT in URL query (no NextAuth).

V19: Recording storage = Cloudflare R2 (S3-compatible). EncodedFileOutput.s3 = S3Upload(R2 creds). forcePathStyle: true. region: "auto".
     ⊥ LiveKit local disk (cloud egress has none). presigned URL TTL = 24h via @aws-sdk/s3-request-presigner; refresh on session-summary load if endedAt > 24h ago.

V20: LayoutBroadcaster payload → ! include tileOrder + onScreenParticipantIds
     ! rebroadcast on participants.length growth (composite egress worker = late subscriber).
     Why: drag-reorder result must propagate to composite, else preview ≠ recording.
```

## §B — Bugs (historical, fixed)

```
id |date       |cause                                                      |fix
B1 |2026-05-12 |AnimatedChatWidget interval pushed `undefined` past array  |guard `const next=ARR[i]; if(next)…` + filter Boolean in map. V14 → wrap SafeBoundary.
B2 |2026-05-12 |Beta modal scroll-jacks to top on open                     |scroll={false} on all 13 <Link href="?beta=true">. V7.
B3 |2026-05-12 |Marketing page.tsx extra </div> @ line 216                 |delete extra closer. Build was failing on JSX syntax.
B4 |2026-05-12 |Webpack `__webpack_modules__[id] not a function` in dev    |stale .next cache after client-component edits. ∴ kill dev server + rm -rf .next + restart.
B5 |2026-05-12 |blog/[slug] params typed `{slug:string}` broke Next 15    |`params: Promise<{slug:string}>` + await. V10.
B6 |2026-05-12 |Build failed: prisma migrate deploy needs DATABASE_URL    |.env.local dummy + `build:next` script skips migrate.
B7 |2026-05-13 |Studio "Something went wrong" — useConnectionQualityIndicator() no-arg throws outside ParticipantContext on LK components-react v2.9.20 |pass {participant: localParticipant}. V17.
B8 |2026-05-13 |Studio "Something went wrong" #2 — stale dev server cached DATABASE_URL=dummy after .env.local update |kill + restart dev server. B6 carry-over.
B9 |2026-05-13 |Φ2 cavecrew-builder subagent false-claimed LayoutBroadcaster widen + composite withPlaceholder fix without applying |always re-grep claimed edits before promoting to QA. patched inline.
```

## §T — Tasks (open / WIP / done since v2.0)

```
id |status|task                                                |cites
T1 |x     |robots.txt + sitemap.xml routes                     |§I
T2 |x     |metadataBase + site-wide OG/Twitter                 |V11
T3 |x     |homepage metadata + canonical                       |V12
T4 |x     |Organization + SoftwareApplication JSON-LD          |V13
T5 |x     |FAQPage JSON-LD (12 questions, competitor-targeted) |V13
T6 |x     |Footer marquee animation                            |
T7 |x     |/pricing                                            |V12
T8 |x     |/compare/{restream,riverside,streamlabs}-alternative|V12
T9 |x     |/use-cases/{podcasters,educators,churches,gamers}   |V12
T10|x     |/glossary/{multistreaming,rtmp}                     |V12
T11|x     |/tools/bitrate-calculator                           |V12
T12|x     |opengraph-image dynamic (ImageResponse, edge)       |V11
T13|x     |Inter font display:swap                             |
T14|x     |blog/[slug] generateMetadata                        |V10,V12
T15|x     |MemPalace install + mine + MCP register             |§§Tools
T16|.     |Set NEXT_PUBLIC_SITE_URL in Vercel prod env         |§I
T17|.     |/blog/[slug] real content (MDX or CMS, not slug→title) |
T18|.     |More glossary: sfu-vs-mcu, webrtc-streaming, low-latency-streaming |V12
T19|.     |More tools: stream-key-generator, rtmp-tester, aspect-ratio-calculator |
T20|.     |Platform deep-dives: /integrations/{youtube-live,twitch,kick,tiktok-live} |
T21|.     |Per-track local recording (Riverside-parity)        |
T22|.     |4K live egress (gated by destination platform caps) |
T23|x     |Layout Φ1: 1920×1080 canvas + 10 presets + slot resolver |V15,V16
T24|x     |Drag-reorder backstage (dnd-kit pointer + keyboard)  |V16
T25|.     |Layout Φ2: composite egress template /composite/[code] + R2 storage + recordingUrl on StreamSession |V15
T26|.     |Layout Φ2: GuestStudio → reuse <CompositeStage>, drop guest-side grid branches |V15,V16
T27|.     |Layout Φ3: lower-thirds + brand layer + per-platform aspect (9:16 TikTok) |
T28|.     |Tile drag-reorder on stage canvas (dnd-kit + transform-aware sensors) |V16
T29|x     |Custom Egress Template for RTMP egress (replaces built-in "grid") |V15,V18
T30|x     |Φ2: /composite/[code] route + LK subscriber + LayoutHydrator |V18
T31|x     |Φ2: R2 wiring (egress.ts + r2.ts presigned URL helper) |V19
T32|x     |Φ2: StreamSession.{recordingPath,recordingUrl} + record route persistence |V19
T33|x     |Φ2: SessionSummary "Download recording" w/ stale-URL refresh |V19
T34|x     |Φ2: LayoutBroadcaster widen (tileOrder, rebroadcast on participant join) |V20
T35|.     |Φ3: lower-thirds rendered into composite (name labels baked in)
T36|.     |Φ3: per-platform aspect (TikTok 9:16 canvas variant)
T37|.     |Φ3: stage-tile drag-reorder (transform-aware sensors)
T38|.     |Φ2.1: write fresh presigned URL back to DB to skip re-mint on next load (cost) |V19

Status: x done, ~ wip, . todo
```

## §§Tools

```
mempalace: $HOME/Library/Python/3.9/bin/mempalace  (! prepend to PATH per shell)
  mempalace search "<query>" → top-k hybrid (cosine + BM25)
  mempalace status           → drawer counts by room
  mempalace mine .           → re-mine after substantive code changes
  MCP server registered → tools available as mempalace_*

caveman: skill loaded. Applies to SPEC.md, spec-adjacent writes, backprop entries.
  ⊥ apply to: code, error strings, commit msgs, PR descriptions, user-facing docs.
  cavecrew agents: investigator (code locator), builder (1-2 file edit), reviewer (diff review). All compress output ~60%.

seo skills installed: seo-audit, programmatic-seo, ai-seo, web-quality-skills/seo
  Use programmatic-seo for batch /use-cases/* and /glossary/* generation.
```

## §§Architecture quick-ref

```
Browser ─WebRTC→ LiveKit SFU ─RTMP→ {YouTube,Twitch,Kick,TikTok,custom-RTMP}
   │                  │
   ↓                  ↓
Next.js API ←──→ Upstash Redis (event bus, chat relay, rate limit, room cache)
   ↓
Neon Postgres (Prisma ORM w/ V2 retry)

Marketing (route group): src/app/(marketing)/ → public, no auth.
Studio:                  src/app/studio/[code]/ → host UI, auth required.
Guest:                   src/app/join/[code]/ → preview→request→studio.
Demo:                    src/app/demo/[code]/ → no-auth demo.
```
