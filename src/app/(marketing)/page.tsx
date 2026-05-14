import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { ArrowRight, PlayCircle } from "lucide-react";
import { PRIMARY_CTA_HREF, PRIMARY_CTA_LABEL, LAUNCH_OPEN } from "@/lib/launch";
import PlatformIcon from "@/components/ui/PlatformIcon";
import { AnimatedChatWidget } from "@/components/AnimatedChatWidget";
import { SafeBoundary } from "@/components/SafeBoundary";
import { FaqSection } from "@/components/FaqSection";

export const metadata: Metadata = {
  title: "Zerocast — Multistream to YouTube, Twitch, Kick & TikTok with an AI Co-Host",
  description:
    "Run your whole live stream from the browser. Multistream to every platform, let the AI Co-Host moderate chat and reply in your voice — no OBS, no downloads, no hardware.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Zerocast — Multistream Everywhere with an AI Co-Host",
    description:
      "Browser-based live streaming studio. Multistream to YouTube, Twitch, Kick, TikTok and custom RTMP. AI Co-Host runs chat in your voice.",
    url: "/",
    type: "website",
  },
};

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="text-white selection:bg-brand/30">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 -z-10 brand-glow-hero" />

        <div className="max-w-7xl mx-auto w-full">
          {/* Status pill */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-soft border border-brand/20 rounded-full px-4 py-1.5 mb-12">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-soft animate-pulse" />
            Private Beta — Now Accepting Applications
          </div>

          {/* Main headline — editorial oversized */}
          <h1 className="font-black tracking-tighter text-white leading-[1] mb-8"
            style={{ fontSize: "clamp(48px, 8vw, 110px)" }}>
            Don&apos;t just stream.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-soft to-accent-purple">
              Co-host with AI.
            </span>
          </h1>

          {/* Subtext row */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10 mt-12 pt-8 border-t border-white/5">
            <p className="text-ink-muted text-lg max-w-md leading-relaxed">
              The browser-based studio that multistreams everywhere — while your AI Co-Host manages your chat, answers in your voice, and runs the whole production.
            </p>
            <div className="flex items-center gap-4 shrink-0">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-white text-ink-inverse font-bold px-7 py-3.5 rounded-full text-sm hover:bg-brand-on-light transition-all"
                >
                  Go to Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link
                    href={PRIMARY_CTA_HREF}
                    scroll={!LAUNCH_OPEN ? false : undefined}
                    className="inline-flex items-center gap-2 bg-white text-ink-inverse font-bold px-7 py-3.5 rounded-full text-sm hover:bg-brand-on-light transition-all"
                  >
                    {PRIMARY_CTA_LABEL} <ArrowRight size={16} />
                  </Link>
                  <a
                    href="https://youtube.com/watch?v=placeholder"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-ink-muted hover:text-white text-sm font-medium transition-colors"
                  >
                    <PlayCircle size={18} /> Watch Demo
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORMS TICKER ──────────────────────────────────── */}
      <section className="border-y border-white/5 py-6 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-ink-faint mr-4">Streams to</span>
          {["youtube", "twitch", "kick", "tiktok"].map((p) => (
            <div
              key={p}
              className="inline-flex items-center gap-2 border border-white/8 rounded-full px-4 py-1.5 text-sm text-ink-emphasis"
            >
              <PlatformIcon platform={p} size={16} />
              <span className="capitalize">{p === "tiktok" ? "TikTok" : p.charAt(0).toUpperCase() + p.slice(1)}</span>
            </div>
          ))}
          <span className="text-ink-faint text-sm ml-2">+ Custom RTMP</span>
        </div>
      </section>

      {/* ── LIVE DEMO — AI Co-Host in action ─────────────────── */}
      <section className="px-6 py-28 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-soft mb-6">Live Demo</p>
            <h2 className="font-black text-white leading-[1.05] tracking-tight mb-6"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}>
              Watch your AI Co-Host work the room.
            </h2>
            <p className="text-ink-subtle text-base leading-relaxed max-w-md">
              Replies to viewers in your voice, acknowledges subs, answers FAQs — while you stay locked into your content. No prompts, no hotkeys, no second monitor.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <SafeBoundary>
              <AnimatedChatWidget />
            </SafeBoundary>
          </div>
        </div>
      </section>

      {/* ── WHAT IT IS ────────────────────────────────────────── */}
      <section className="px-6 py-28 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-20 items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-6">The Problem</p>
            <h2 className="font-black text-white leading-[1.05] tracking-tight mb-6"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}>
              Running a live stream is a three-person job you&apos;re doing alone.
            </h2>
          </div>
          <div className="space-y-8 pt-8 md:pt-14">
            {[
              ["01", "Chat Overload", "Managing 4 simultaneous chat streams is impossible when you&apos;re mid-conversation with a guest."],
              ["02", "Production Burden", "Scene switching, layout changes, screen sharing — it pulls focus from your content."],
              ["03", "Missed Moments", "A great question gets buried. A super chat goes unread. Your audience feels ignored."],
            ].map(([num, title, desc]) => (
              <div key={num} className="flex gap-6 pb-8 border-b border-white/5 last:border-0">
                <span className="text-xs font-black text-ink-fainter tabular-nums mt-1 shrink-0">{num}</span>
                <div>
                  <p className="font-semibold text-white mb-1">{title}</p>
                  <p className="text-ink-subtle text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE SOLUTION — full-bleed dark ────────────────────── */}
      <section className="bg-surface-2/30 border-y border-white/5 px-6 py-28">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-20">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-soft">Zerocast&apos;s Answer</p>
            <h2 className="font-black text-white tracking-tight max-w-2xl leading-[1.05]"
              style={{ fontSize: "clamp(32px, 4vw, 54px)" }}>
              An AI that knows your stream, speaks in your voice, and never misses a beat.
            </h2>
          </div>

          {/* Horizontal feature list — no cards */}
          <div className="space-y-0">
            {[
              {
                label: "Tone Matching",
                desc: "Feed the AI your past chat logs and scripts. It learns your tone, catchphrases, and moderation style — then engages your audience exactly as you would.",
                href: "/features/ai-cohost",
              },
              {
                label: "Auto-Scene Switching",
                desc: "No hotkeys. The AI detects when a guest speaks or you share a screen and automatically switches to the right layout.",
                href: "/features/ai-cohost",
              },
              {
                label: "Smart Moderation",
                desc: "Context-aware banning, superchat highlighting, and FAQ answering — based on what you&apos;re actually talking about, not just word filters.",
                href: "/features/ai-cohost",
              },
              {
                label: "Unified Chat",
                desc: "YouTube, Twitch, Kick, and TikTok chat aggregated into one clean panel. No more tab juggling.",
                href: "/integrations",
              },
            ].map((feat, i) => (
              <Link
                key={feat.label}
                href={feat.href}
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-8 border-t border-white/5 hover:border-brand/30 transition-colors"
              >
                <div className="flex items-start gap-8">
                  <span className="text-xs font-black text-ink-fainter tabular-nums mt-1 shrink-0 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-bold text-white text-lg mb-1 group-hover:text-brand-softer transition-colors">{feat.label}</p>
                    <p className="text-ink-subtle text-sm leading-relaxed max-w-lg">{feat.desc}</p>
                  </div>
                </div>
                <ArrowRight className="shrink-0 text-ink-fainter group-hover:text-brand-soft group-hover:translate-x-1 transition-all" size={20} />
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ── SOCIAL PROOF / STAT STRIP ─────────────────────────── */}
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            ["8", "Streaming destinations simultaneously"],
            ["1080p", "Crystal-clear cloud routing"],
            ["0", "Software to install — ever"],
            ["∞", "AI personas, your voice"],
          ].map(([stat, label]) => (
            <div key={stat} className="group border-l border-white/5 first:border-l-0 pl-8 first:pl-0 py-6 transition-all hover:bg-white/5 cursor-default">
              <p className="font-black text-white leading-none mb-2 transition-transform group-hover:scale-105 group-hover:text-brand-soft origin-left" style={{ fontSize: "clamp(36px, 5vw, 64px)" }}>
                {stat}
              </p>
              <p className="text-ink-subtle text-sm leading-snug max-w-[160px] group-hover:text-ink-emphasis transition-colors">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="border-t border-white/5 px-6 py-28 bg-surface-1/40">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-16">How it works</p>
          <div className="grid md:grid-cols-3 gap-0">
            {[
              ["01", "Create your studio", "Sign in, click Start. Your browser-based studio is live in seconds — no hardware, no downloads."],
              ["02", "Train your AI", "Paste your past chat logs or write a persona brief. Your AI Co-Host learns how you talk."],
              ["03", "Go live everywhere", "Pick your platforms, set your layout, and let the AI handle the rest while you focus on content."],
            ].map(([num, title, desc]) => (
              <div key={num} className="border-l border-white/5 first:border-l-0 pl-10 first:pl-0 pr-10">
                <p className="font-black text-white/10 leading-none mb-6 tabular-nums"
                  style={{ fontSize: "clamp(64px, 8vw, 96px)" }}>
                  {num}
                </p>
                <p className="font-bold text-white text-lg mb-3">{title}</p>
                <p className="text-ink-subtle text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <FaqSection />

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="px-6 py-28 max-w-7xl mx-auto text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-8">Private Beta</p>
        <h2 className="font-black text-white tracking-tight mb-6 leading-[0.95]"
          style={{ fontSize: "clamp(48px, 8vw, 112px)" }}>
          Stream smarter.<br />
          <span className="text-ink-faint">Starting now.</span>
        </h2>
        <p className="text-ink-subtle text-lg max-w-lg mx-auto mb-12">
          We&apos;re letting in a select group of creators to help us shape the platform. Spots are limited.
        </p>
        <Link
          href={PRIMARY_CTA_HREF}
          scroll={!LAUNCH_OPEN ? false : undefined}
          className="inline-flex items-center gap-2 bg-white text-ink-inverse font-bold px-10 py-5 rounded-full text-base hover:bg-brand-on-light transition-all hover:scale-105"
        >
          {LAUNCH_OPEN ? "Sign up free" : "Request Beta Access"} <ArrowRight size={18} />
        </Link>
      </section>

    </div>
  );
}
