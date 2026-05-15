# Zerocast — Launch-day Copy

Tagline: **Don't just stream. Co-host with AI.**
Strong line: A three-person job you're doing alone.

Placeholders used throughout: `{{PH_URL}}`, `{{SIGNUP_URL}}`, `{{WAITLIST_HOST}}`.

---

## 1. X / Twitter launch thread (founder account — Avi)

**1/** Streaming solo is a three-person job. Camera op, chat mod, producer. We rebuilt all three into one browser tab. Zerocast is live on Product Hunt today. [GIF: studio view → 4 platforms going live → AI Co-Host replying in chat, ~6s loop]

**2/** Multistream to YouTube, Twitch, Kick, TikTok at the same time. Plus any custom RTMP target. No OBS. No restream service in the middle. Just open a tab and go live.

**3/** The part I cared about most: the AI Co-Host. It reads your chat across every platform, replies in your voice, and surfaces the questions worth answering on stream. Subs and bits get acknowledged automatically.

**4/** Built on LiveKit for the WebRTC plumbing. Neon Postgres for state. Upstash Redis for the event bus. Boring stack, fast feedback loops, sub-second guest admit.

**5/** I built this because I was tired of running OBS + a chat dashboard + a co-host who flaked. Solo streamers shouldn't need a producer. They need leverage.

**6/** Free tier covers the studio, two-platform multistream, and the AI Co-Host with usage limits. Pro unlocks the four-platform fan-out, recording, and unlimited co-host turns.

**7/** Live on Product Hunt now. If you stream, even occasionally, I'd love your eyes on it. {{PH_URL}}

---

**A/B variants for tweet 1:**

- **(v1)** I spent a year building the studio I wish I had. Open one browser tab. Go live to YouTube, Twitch, Kick, TikTok. The AI Co-Host runs chat. Zerocast is on Product Hunt today.
- **(v2)** Most streaming software is a UI from 2014 with AI bolted on. Zerocast is the other way around. Browser-native, AI Co-Host built in, four platforms from one tab. Launching on PH today.
- **(v3)** OBS asks you to be a video engineer before you're allowed to talk. Zerocast asks you to click "Go Live." That's the whole pitch. We're live on Product Hunt now.

> _Meta: founder account, follower base is mostly devs + early streamers. Hook leads with pain ("three-person job"), proof is the demo GIF, close is the ask. Variants test pain-led vs craft-led vs anti-OBS angles._

---

## 2. X / Twitter launch post (Zerocast company account)

Zerocast is live on Product Hunt. Browser-native multistream studio with an AI Co-Host that runs your chat across YouTube, Twitch, Kick, and TikTok. No OBS. One tab. {{PH_URL}}

**Alternate 1:**
We launched. Zerocast streams to four platforms from one browser tab and the AI Co-Host handles chat in your voice. Live on Product Hunt now: {{PH_URL}}

**Alternate 2:**
Don't just stream. Co-host with AI. Zerocast is live on Product Hunt today — multistream studio + AI chat co-host, all in the browser. {{PH_URL}}

> _Meta: brand-account voice is third-person, slightly cooler than the founder thread. Same payload, less personality, designed to be quote-tweeted by Avi for amplification._

---

## 3. LinkedIn launch post (founder)

A year ago I tried to run a four-platform interview show by myself. I had OBS open, a chat moderator tab open, a producer doc open, and a co-host who joined late. By the end of the show I had answered roughly six percent of the chat and missed two sub notifications I'd promised to call out. That night I started building Zerocast. Today it's live on Product Hunt. It's a browser-native streaming studio with an AI Co-Host that reads chat across every platform you're broadcasting to and replies in your voice — so the solo creator doesn't have to choose between hosting and moderating.

What's in the box:

- Multistream to YouTube, Twitch, Kick, TikTok, and any custom RTMP target from one browser tab.
- Real-time AI Co-Host with chat moderation and sub acknowledgement.
- Guest admit flow with sub-second join. No OBS, no plugins, no studio download.
- Recording, session summaries, and a chat archive across every platform.

If you make video, would love your support today. Product Hunt: {{PH_URL}} · Sign up: {{SIGNUP_URL}}

> _Meta: LinkedIn audience skews B2B / professional creators / founders. The "I failed at my own show" opener earns the right to pitch. Closes with concrete deliverables, not adjectives._

---

## 4. Instagram / Threads caption

Streaming solo is a three-person job. Camera op. Chat mod. Producer. We folded all three into one browser tab.

Zerocast multistreams to YouTube, Twitch, Kick, and TikTok at the same time, and the AI Co-Host runs your chat in your voice — answers the regulars, surfaces the real questions, calls out the new subs. No OBS. No plugins. No studio download. Open a tab, click Go Live.

We're live on Product Hunt today. Link in bio. If you stream even casually, we'd love your eyes on it.

**Hashtags:** #ProductHunt #LiveStreaming #ContentCreators #Multistream #StreamingTools #AIForCreators #IndieMakers

> _Meta: IG / Threads audience is broader and visual. Caption stands alone without the GIF. Hashtag mix balances launch-day discovery (#ProductHunt, #IndieMakers) with creator-tool intent._

---

## 5. Wait-list email (transactional — sent launch morning)

**Subject line (primary):** Your Zerocast spot is open.

**Subject line alternates:**

- You're off the wait-list. Come in.
- The studio you signed up for is live.
- Two months, one tab. Zerocast is open.

---

**Body — plain text:**

You signed up for Zerocast back when it was a landing page and a promise. Thank you for waiting. The studio is live today.

Here's what's open for you, starting now:

- Multistream to YouTube, Twitch, Kick, TikTok from one browser tab.
- The AI Co-Host, replying in your voice across every platform's chat.
- Guest admit flow with sub-second join. No download, no plugins.
- Free tier you can use today. No card required.

We're also launching on Product Hunt this morning. If you've got a minute, an upvote helps a lot — but the bigger thing is: please go break it. Stream something. Tell us what's missing.

Claim your spot → {{SIGNUP_URL}}?ref=waitlist

— Avi
Founder, Zerocast (by NexProve)

P.S. Bring a friend who streams and you both get three months of Pro free. Same link, just forward this email — anyone who signs up from your forward gets credited to your account.

---

**HTML structural notes (for the dev who builds the template):**

- **Block 1 — Preheader:** "Two months on the list. The studio is live." (hidden, ~90 chars, shows in inbox preview.)
- **Block 2 — Wordmark only, no hero image.** Centered, 32px, monochrome. Keeps the launch email feeling like a personal note, not a marketing blast.
- **Block 3 — Body paragraph 1.** Single column, 560px max, left-aligned, 16px line-height 1.55. Same typeface as the marketing site.
- **Block 4 — Bulleted list.** Four bullets, tight spacing, no icons. Bullets sit on a faintly tinted background card so they're scannable on mobile.
- **Block 5 — Body paragraph 2** (PH ask). Plain text, no callout box. Don't make the PH ask louder than the welcome.
- **Block 6 — Primary CTA button.** Single button: "Claim your spot." Solid fill, full-width on mobile, max ~280px on desktop. Links to `{{SIGNUP_URL}}?ref=waitlist`. UTM: `utm_source=email&utm_medium=transactional&utm_campaign=launch_waitlist`.
- **Block 7 — Signature.** Plain text. Avi's name, then "Founder, Zerocast (by NexProve)." No headshot, no social icons row. Keep it letter-shaped.
- **Block 8 — P.S. line.** Italic, same size as body. Referral copy.
- **Block 9 — Footer.** Mailing address, unsubscribe link, "You're getting this because you joined the Zerocast wait-list at {{WAITLIST_HOST}} on $signup_date." Use the stored timestamp from `BetaRequest.createdAt`.

> _Meta: list is small + warm; people opted in and waited months. Voice has to read like a letter, not a campaign. Specific gratitude ("back when it was a landing page and a promise") outperforms generic thanks. Referral P.S. is concrete (three months Pro, both sides) — vague offers don't move._

---

## 6. Product Hunt first comment (Maker)

Hey Product Hunt — Avi here, maker of Zerocast.

Short version of why this exists: I ran a four-platform interview show solo for about a year. OBS in one window, four chat tabs in another, a producer doc on a second monitor, and a co-host who joined twelve minutes late roughly half the time. I was answering maybe one chat message in twenty and missing sub shout-outs I'd promised. The studio I wanted didn't exist, so I built it.

Zerocast is a browser-native multistream studio. Open a tab, go live to YouTube, Twitch, Kick, TikTok, or any custom RTMP target — all four at once if you want. The AI Co-Host reads chat across every platform, replies in your voice, surfaces the questions worth answering on stream, and acknowledges new subs and bits without you breaking flow.

What's free: the studio, two-platform multistream, AI Co-Host with daily turn limits, guest admit, recording for short sessions.

What's Pro: four-platform fan-out, unlimited co-host turns, full recording + session summaries, custom RTMP.

On the roadmap: a moderation co-pilot (rules you describe in plain English), per-guest audio mix, and a Studio API so you can drive the room from your own tooling.

One specific ask: if you've moderated chat for a multi-platform stream — what's the one workflow you're sure we're going to mess up? I'd rather hear it now than ship a half-baked moderation surface in v2.1.

> _Meta: PH maker comments that perform have a confession, a clear free/paid split, a visible roadmap, and a question only an expert can answer. The mod-workflow ask filters for the exact users we want feedback from._

---

## 7. Slack / Discord community launch announce

Hey all — we're live on Product Hunt today. Zerocast — browser-native multistream studio with an AI Co-Host that runs your chat across YouTube, Twitch, Kick, and TikTok. No OBS, no plugins, one tab.

We spent over a year on this and the first six hours of PH basically decide the whole day. Would mean the world if you upvoted before noon PT: {{PH_URL}}

Happy to answer anything in-thread.

> _Meta: drop-in for community Slacks / indie hacker Discords / friends-of-the-company channels. Asks for one concrete action (upvote before noon PT) and gives a real reason (PH ranking is front-loaded)._

---

## 8. PH-day calendar / agenda for Avi

- **12:01 AM PT** — Hit publish on Product Hunt. Post the founder X thread immediately after — the PH algorithm weighs early external traffic. Send the wait-list email blast (already scheduled, just confirm it went). Send the company X post 4 minutes after the founder thread so it doesn't look coordinated.
- **12:30 AM – 2:00 AM PT** — Respond to the first 20 PH comments by hand. No templated replies. Use the commenter's name. If they ask a roadmap question, answer with a date or "no date yet" — never "soon."
- **6:00 AM PT** — Post the LinkedIn launch post. Drop the Slack / Discord blurb in NexProve community, IndieHackers Slack, and the two streaming Discords you have access to. Forward the PH link to the seven people who explicitly said "tell me when you launch."
- **9:00 AM PT** — Post the Instagram / Threads caption with the same GIF as the X thread. Reshare the founder thread as a quote-tweet from the Zerocast company account with one new line of context ("rank 4 on PH right now — keep them coming").
- **12:00 PM PT** — Mid-day push: post a screenshot of the live PH ranking + a thank-you tweet tagging the first 10 hunters/commenters by handle. Email the 25 wait-list users who haven't opened the morning email yet with a different subject line ("PH is going well — come see").
- **3:00 PM PT – 6:00 PM PT** — Final push window. Reply to every new PH comment within 10 minutes. Post one closing X tweet at 5:45 PM PT thanking the day and pointing late arrivals at `{{SIGNUP_URL}}`. At 6:00 PM PT exactly, write tomorrow's follow-up post (don't post it — just draft it while the day is fresh).

> _Meta: founder-facing checklist, not external copy. Designed around the PH algorithm (front-loaded traffic + comment velocity) and the realistic energy curve of a solo launch day._
