# Session handoff — launch-runway thread

Snapshot taken 2026-05-16. Maintained by the Claude session that owns the
14-day launch plan (parallel to other Claude sessions doing studio Φ
work, F-XX features, SEO, PostHog dashboards, etc.).

**Purpose**: any new session can pick up this thread without re-deriving
context. Includes parallelizable task bundles + paste-ready subagent
prompts so the next session can fan work out fast.

---

## Snapshot

```
date           2026-05-16
branch         main
launch target  2026-05-26 (Day 14 — Product Hunt + email blast)
day            Day 4 of 14
last commit    e96c925  fix(security): create-demo-room.mjs env-source
parallel       studio Φ work, SEO, PostHog, F-23/24/25/26 — separate threads
```

---

## 14-day launch plan — progress

```
Day 1   reliability blitz         ✓  rehydration audit + homegrown error reporter
Day 2   e2e dry-run               ⏳ MANUAL — needs human + second device
Days 3-5 Product Hunt kit         ✓  scenes + variants + chevron fix + maker scene
Days 6-8 funnel sharpen           ✓  CTA toggle + dashboard empty-state + demo overlay
Days 9-11 soft launch             ⏳ MANUAL — invite ~10 trusted humans
Days 12-13 launch content         ½  blog draft + social/email copy in docs/launch/
                                     STILL TODO: drop blog into MDX route, fill placeholders
Day 14  ship                      ⏳ Product Hunt submission + email blast + be online
```

---

## Open tasks — parallelizable

### Bundle A — launch content (3 parallel agents possible)

```
A1  Convert docs/launch/blog-launch-post.md → real route
      → new file src/app/(marketing)/blog/dont-just-stream-co-host-with-ai/page.tsx
      → use existing blog/[slug] pattern (read src/app/(marketing)/blog/[slug]/page.tsx)
      → keep frontmatter metadata, render as a TSX page (the project doesn't use MDX)

A2  Fill the {{PH_URL}}, {{SIGNUP_URL}}, {{WAITLIST_HOST}} placeholders in
    docs/launch/social-email-copy.md once those URLs are locked.

A3  Wire wait-list email send — three options:
      a) Resend transactional with the email body from social-email-copy.md
      b) Manual export via /admin/beta-requests CSV → Resend campaign in dashboard
      c) Skip emails for v1, post on socials only
    Decision needed BEFORE Day 12 because Resend domain DKIM needs ~24h.
```

### Bundle B — demo polish round 2 (1-2 agents)

```
B1  /demo "Demo Host" placeholder name — replace with friendlier label
      → look at scripts/create-demo-room.mjs line ~25 (Dev Admin host name)
      → consider passing host name through query param or just using "Demo Studio"

B2  /demo SEO + social meta tags
      → generateMetadata() on src/app/demo/[code]/page.tsx
      → "Try Zerocast Live Demo — Multistream Studio"
      → custom OG image via /og/marketing?scene=hero&variant=og

B3  /demo token expired → friendlier recovery screen
      → currently redirects to /login with no context
      → show "This demo link has expired. [Get a fresh demo →]"
      → button could mailto:hello@zerocast.live OR a /request-demo form
```

### Bundle C — env + ops cleanup (1 agent each)

```
C1  Drop stale env vars in Vercel prod:
      vercel env rm AUTH_SECRET production -y
      vercel env rm AUTH_URL production -y
    src/auth.ts reads NEXTAUTH_SECRET / NEXTAUTH_URL. The AUTH_* duplicates
    are NextAuth v4 leftover. Verify nothing else reads them before removing.

C2  Set R2_PUBLIC_URL if you want public recording URLs vs 24h presigned.
      Need: a Cloudflare domain bound to the R2 bucket
      Then: vercel env add R2_PUBLIC_URL production (paste URL)

C3  Optional 6x POSTHOG_DASHBOARD_* env vars for /admin/posthog deep-links.
    Skip if you don't have curated dashboards yet — page falls back gracefully.
```

### Bundle D — final QA + dry-runs (HUMAN, agents can prep checklists)

```
D1  Full studio dry-run: create a room, invite a guest from another browser,
    stream to a real YouTube Studio "test" destination, end + verify recording
    lands in R2 with a working download URL. Find what breaks. (Day 9-11)

D2  PH submission dry-run: log into Product Hunt, prepare the listing as draft
    (don't submit), confirm all 5 gallery images render via /og/marketing PNG
    URLs, confirm Maker comment fits the 280-char limit, confirm "Schedule
    for tomorrow" works.

D3  Wait-list email test: send the email to yourself first via the Resend
    test sender. Confirm DKIM passes Gmail spam triage.

D4  Mobile dry-run: open /demo/<code>?token=… on iPhone Safari, hit every
    button. The DemoOverlay countdown should stay readable, the bottom-right
    CTA should not collide with the iOS bottom bar.
```

### Bundle E — observability polish

```
E1  Sentry integration was committed by a parallel session (sentry.server.config.ts,
    sentry.edge.config.ts, instrumentation.ts fans to BOTH Sentry + the homegrown
    /admin/errors beacon). Verify SENTRY_DSN is in prod env. If unset, Sentry
    is a no-op — fine, but won't catch anything launch day.

E2  /admin/errors viewer — check that the homegrown Redis ring buffer is being
    written to. Trigger a test 500 in prod (e.g. malformed POST to /api/errors),
    confirm it shows up in /admin/errors within ~30s.

E3  PostHog funnel — confirm /admin/funnel renders real data after this redeploy.
    POSTHOG_PROJECT_ID + POSTHOG_PERSONAL_API_KEY were added today; previous
    deploy threw because they were unset.
```

---

## Subagent dispatch recipes — paste-ready prompts

When picking up this thread, fan these out in one parallel batch. Each is
self-contained — does not need this handoff doc as context.

### Recipe 1 — convert blog draft to live route

```
Spawn: caveman:cavecrew-builder

Prompt:
Convert docs/launch/blog-launch-post.md into a Next.js page at
src/app/(marketing)/blog/dont-just-stream-co-host-with-ai/page.tsx.

Pattern: read src/app/(marketing)/blog/[slug]/page.tsx first to learn how the
project renders blog posts (this repo does NOT use MDX — blog content lives
inline in TSX files).

Requirements:
- Map the markdown frontmatter (title, slug, date, author, excerpt, tag) to
  Next's Metadata export.
- Render the prose as semantic JSX. Headings get the same styles as other
  marketing pages (look at /features or /pricing for examples).
- Add a canonical URL pointing at /blog/dont-just-stream-co-host-with-ai.
- Add OG image: /og/marketing?variant=og&scene=hero.
- The CTA at the bottom uses PRIMARY_CTA_HREF + PRIMARY_CTA_LABEL from
  @/lib/launch so it flips with NEXT_PUBLIC_LAUNCH_OPEN.

⊥ change the markdown source. ⊥ install new deps. Lint must pass.
```

### Recipe 2 — sweep all stale ?beta=true links

```
Spawn: caveman:cavecrew-builder (with the file-scope warning)

Prompt:
Sweep every <Link href="?beta=true"> across src/app/(marketing)/** and replace
the href + label text with PRIMARY_CTA_HREF + PRIMARY_CTA_LABEL imports from
@/lib/launch. The launch toggle is already plumbed; this just removes the
mid-launch UX wrinkle where some pages still say "Request Access" + redirect.

Touch only marketing pages (NOT webapp surfaces). Touch BetaModal only if its
LAUNCH_OPEN short-circuit is still missing (it should already redirect to
/login on ?beta=true clicks).

Scope is wider than 1-2 files — if cavecrew-builder refuses, fall back to
general-purpose. Include a one-line diff receipt per file.
```

### Recipe 3 — full pre-launch security review

```
Spawn: caveman:cavecrew-reviewer

Prompt:
Pre-launch security review. Goal: ship Product Hunt on 2026-05-26 with no
embarrassing bug or auth gap.

Scope: last 30 commits on main. `git log --oneline -30` to get the list.

Look for:
- /api/* routes that don't call auth() or requireAdmin() or authenticateHost()
- /admin/* pages that don't trust the layout's requireAdmin()
- Any secret leaked via console.log or NEXT_PUBLIC_*
- Rate limit gaps on new endpoints (we have rateLimitGuard)
- Stale Prisma queries that don't escape user input (Prisma is parameterized
  by default, so this is rare — but check raw `$queryRaw` calls)
- Anything that calls process.env.* inside a "use client" component

Skip style nits. One line per finding, severity-tagged. End with verdict:
"Ship as-is" / "Fix N blockers first" / "Hold launch".
```

### Recipe 4 — PH launch day battlestation

```
Spawn: general-purpose

Prompt:
Build a launch-day battlestation document at docs/launch/battlestation.md.
This is the doc the founder reads at 11pm the night before launch + keeps
open all of launch day. Single page.

Sections:
1. PH submission checklist — exact fields + assets to upload, copy-paste
   ready (from docs/launch/social-email-copy.md PH Maker comment).
2. Pre-launch checklist (T-2h) — final env verify, deploy check, monitoring
   tabs to open.
3. Launch sequence (T-0 to T+30m) — submit PH, then in order: wait-list
   email send, X thread post, LinkedIn post, Slack/Discord ping.
4. Hour-by-hour playbook (every 2h checkpoint) — what to check in PostHog,
   what to respond to, when to schedule the second wave of posts.
5. War-room comms — Slack channel, on-call contacts, decision tree for
   "what if X is on fire" (Redis down, LiveKit ingest failing, OAuth blocked).
6. Day-2 wrap — metrics dump template, retro questions, what to email
   wait-list non-converters.

Keep total length ≤ 3 screens (~1500 words). Heavy on bullet lists, light
on prose. No emojis.
```

---

## Outstanding decisions

```
🟡 git history leak           commit 8dc5587 has old (rotated, dead) LiveKit + Redis
                              + DB creds in source. Options:
                                a) accept (rotated creds are revoked, low real risk)
                                b) git filter-repo purge + force-push (rewrites SHAs
                                   for everyone with a clone — painful)
                              No deadline. Pick before public launch.

🟡 wait-list email channel    Resend transactional / dashboard campaign / skip
                              See Bundle A3. DKIM lead time ~24h, so decide by
                              Day 11 (2026-05-23).

⚪ POSTHOG dashboards         /admin/posthog deep-link slots are optional. Set the
                              6 POSTHOG_DASHBOARD_* env vars in Vercel prod if
                              you want curated dashboards instead of root-link
                              fallback.

⚪ AUTH_SECRET / AUTH_URL     dead duplicates in prod env. Remove anytime; not
                              load-bearing.
```

---

## Env state — prod

Last verified 2026-05-16, all set within last hour:

```
ROTATED  LIVEKIT_API_KEY · LIVEKIT_API_SECRET · NEXT_PUBLIC_LIVEKIT_URL
ROTATED  NEXTAUTH_SECRET (invalidates all sessions on next deploy)
ROTATED  R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY · R2_BUCKET · R2_ENDPOINT
ROTATED  DATABASE_URL · DIRECT_URL (Neon)
ROTATED  UPSTASH_REDIS_REST_URL · UPSTASH_REDIS_REST_TOKEN
ADDED    NEXT_PUBLIC_LAUNCH_OPEN=false (flip true on launch morning)
ADDED    POSTHOG_PROJECT_ID · POSTHOG_PERSONAL_API_KEY
UNCHANGED  Google · Resend · Gemini · NEXT_PUBLIC_POSTHOG_*
PENDING  Sentry DSN (parallel session may have added)
```

After this handoff: deploying via `vercel --prod` to bake the new
NEXT_PUBLIC_* values and pick up server-side secrets.

---

## Resume instructions

If you're a new Claude session reading this:

1. Run `git log --oneline -20` to see what's landed since the snapshot date
   above. Anything past `e96c925` is parallel-session work — DO NOT touch
   without grepping `git log --all --pretty=format:'%an %s'` to confirm
   authorship.
2. Read this doc top-to-bottom. Pick a Bundle (A / B / C / D / E).
3. Fan out the relevant Recipe(s) via the Agent tool in PARALLEL. Each
   recipe is self-contained — don't pass this doc as context.
4. As agents finish, commit their work in separate commits (per the
   parallel-claude rule: stage only your own files, never `git add .`).
5. Update this doc:
    - Move completed bundle items to a `## Done this session` block
    - Add any new tasks discovered to the appropriate Bundle
    - Bump the snapshot date at the top
6. If you do prod env changes, sync the "Env state" block.

**Never push without explicit user confirmation.** Never commit on parallel
sessions' behalf. Never force-push.
