"use client";

import Script from "next/script";
import posthog from "posthog-js";

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Do I need to download anything to use Zerocast?",
    a: "No. Zerocast runs entirely in your browser. You can go live, invite guests, share your screen, and control your AI Co-Host without installing OBS, vMix, or any other software.",
  },
  {
    q: "Is multistreaming to YouTube and Twitch against their Terms of Service?",
    a: "No. YouTube Live and Kick allow simultaneous streaming. Twitch removed its exclusivity clause for non-Partners in 2022, and most Partners can now multistream as well. TikTok Live is permitted as long as you have a single account broadcasting. Zerocast routes one outbound RTMP feed per destination — the same as Restream or StreamYard.",
  },
  {
    q: "How does Zerocast compare to StreamYard, Restream, and Riverside?",
    a: "StreamYard pioneered the in-browser studio but does not include an AI Co-Host. Restream focuses on multistreaming and recently added basic AI captions, not in-voice chat replies. Riverside is optimized for recording podcasts, not live audience interaction. Zerocast combines all three — browser studio, multistreaming, and a context-aware AI Co-Host that replies in your voice.",
  },
  {
    q: "Does the AI Co-Host clone my actual voice?",
    a: "No. We use 'Tone Matching' — the AI learns your writing style, catchphrases, and moderation tone from past chat logs or a short persona brief you provide. It responds in text via chat, never in audio, and never impersonates you outside chat.",
  },
  {
    q: "Which platforms can I multistream to?",
    a: "YouTube Live, Twitch, Kick, and TikTok Live simultaneously, plus any custom RTMP destination (Facebook Live, LinkedIn Live, Trovo, Rumble, a self-hosted server — anything that accepts an RTMP ingest URL and stream key).",
  },
  {
    q: "How many guests can I invite to a single stream?",
    a: "Up to 5 guests on stage at once, plus the host, for a total of 6 participants per room. Additional viewers can join chat from any of the connected streaming platforms without consuming guest seats.",
  },
  {
    q: "What internet speed do I need to stream with Zerocast?",
    a: "A consistent 10 Mbps upload is the practical minimum for 1080p multistreaming. 20 Mbps+ recommended for streaming to 4+ platforms simultaneously. Because Zerocast uses cloud-based RTMP fan-out, you only upload one stream regardless of how many destinations you publish to.",
  },
  {
    q: "Can I record my stream locally or to the cloud?",
    a: "Yes. Every studio session can be recorded to the cloud via LiveKit Egress and downloaded after the broadcast ends. Local recordings of individual guest tracks are on the roadmap.",
  },
  {
    q: "Does Zerocast support 4K live streaming?",
    a: "1080p at 60fps is the current default. 4K live output is on the roadmap but is gated by encoder support on the destination platforms — YouTube and Twitch both have hard upload bitrate caps that make 4K live nontrivial.",
  },
  {
    q: "Is there a free plan?",
    a: "Zerocast is in private beta. Beta participants get full access at no cost. Pricing tiers (including a free tier with watermarked streams) will be announced at public launch.",
  },
  {
    q: "Do I still need OBS if I use Zerocast?",
    a: "No, but you can keep it. The 'External Encoder' integration lets you push your existing OBS or vMix output into Zerocast as a single RTMP source — then Zerocast fans it out to every platform and aggregates chat for you.",
  },
  {
    q: "Can I monetize streams across all platforms at once?",
    a: "Yes. Each platform's native monetization (YouTube Super Chats, Twitch Bits, TikTok Gifts, Kick subs) is preserved when you multistream. Zerocast aggregates all of these into a single unified activity feed so you never miss a tip.",
  },
];

export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <section
      id="faq"
      className="px-6 py-28 max-w-4xl mx-auto border-t border-white/5"
    >
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-4">
        Frequently Asked Questions
      </p>
      <h2
        className="font-black text-white tracking-tight leading-[1.05] mb-12"
        style={{ fontSize: "clamp(32px, 4vw, 54px)" }}
      >
        Everything you wanted to know about multistreaming.
      </h2>
      <div className="space-y-6">
        {FAQ_ITEMS.map(({ q, a }, i) => (
          <details
            key={i}
            className="group border-b border-white/5 last:border-0 pb-6"
            onToggle={(e) => {
              if (e.currentTarget.open) {
                posthog.capture("faq_opened", { question: q });
              }
            }}
          >
            <summary className="flex items-start justify-between gap-6 cursor-pointer list-none">
              <h3 className="font-bold text-white text-lg leading-snug group-open:text-brand-softer transition-colors">
                {q}
              </h3>
              <span className="shrink-0 mt-1 text-ink-subtle group-open:rotate-45 transition-transform text-xl leading-none">
                +
              </span>
            </summary>
            <p className="text-ink-muted text-sm leading-relaxed max-w-3xl mt-4">
              {a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
