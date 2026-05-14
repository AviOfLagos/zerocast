"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { BetaCta } from "./BetaCta";

const captureFooterClick = (label: string, href: string, section: string) => () => {
  posthog.capture("footer_link_clicked", {
    link_label: label,
    link_href: href,
    section,
  });
};

const columns = [
  {
    heading: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/features/ai-cohost", label: "AI Co-Host" },
      { href: "/pricing", label: "Pricing" },
      { href: "/integrations", label: "Integrations" },
      { href: "/changelog", label: "Changelog" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    heading: "Compare",
    links: [
      { href: "/compare/streamyard-alternative", label: "vs StreamYard" },
      { href: "/compare/restream-alternative", label: "vs Restream" },
      { href: "/compare/riverside-alternative", label: "vs Riverside" },
      { href: "/compare/streamlabs-alternative", label: "vs Streamlabs" },
    ],
  },
  {
    heading: "Use Cases",
    links: [
      { href: "/use-cases/podcasters", label: "Podcasters" },
      { href: "/use-cases/educators", label: "Educators" },
      { href: "/use-cases/churches", label: "Churches" },
      { href: "/use-cases/gamers", label: "Gamers" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/glossary/multistreaming", label: "What is Multistreaming?" },
      { href: "/glossary/rtmp", label: "What is RTMP?" },
      { href: "/tools/bitrate-calculator", label: "Bitrate Calculator" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contribute", label: "Contribute" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-white/5 pt-20 pb-10 px-6 overflow-hidden relative z-10">
      <div className="max-w-7xl mx-auto">

        {/* Marquee wordmark — infinite right→left scroll */}
        <div
          className="mb-16 overflow-hidden -mx-6 select-none"
          aria-hidden="true"
        >
          <div className="marquee-track">
            {Array.from({ length: 2 }).map((_, dup) => (
              <div key={dup} className="flex items-center gap-16 pr-16">
                {["ZEROCAST", "ZEROCAST", "ZEROCAST", "ZEROCAST"].map((word, i) => (
                  <span
                    key={`${dup}-${i}`}
                    className="font-black text-white/[0.06] leading-none tracking-tighter whitespace-nowrap inline-flex items-center gap-16"
                    style={{ fontSize: "clamp(72px, 12vw, 180px)" }}
                  >
                    {word}
                    <span
                      className="text-brand/30"
                      style={{ fontSize: "clamp(48px, 8vw, 120px)" }}
                    >
                      •
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Top row: tagline + join beta */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-16 border-t border-white/5 pt-10">
          <div className="max-w-sm">
            <p className="text-white font-semibold text-lg mb-2">The AI-powered streaming studio.</p>
            <p className="text-ink-subtle text-sm leading-relaxed">
              Stream to every platform, while your AI Co-Host manages chat, production, and engagement in your voice.
            </p>
          </div>
          <BetaCta
            location="footer"
            className="shrink-0 inline-flex items-center gap-2 bg-white text-ink-inverse font-bold px-6 py-3 rounded-full text-sm hover:bg-brand-on-light transition-colors"
          >
            Request Beta Access →
          </BetaCta>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16 border-t border-white/5 pt-10">
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-widest text-ink-faint mb-5">{col.heading}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-subtle hover:text-white transition-colors"
                      onClick={captureFooterClick(link.label, link.href, col.heading)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-faint">
          <div className="flex items-center gap-2">
            <span>© 2026 Zerocast.</span>
            <span>A product by <a
              href="https://nexprove.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors underline underline-offset-2"
              onClick={captureFooterClick("NexProve", "https://nexprove.com", "bottom_bar")}
            >NexProve</a>.</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/AviOfLagos/zerocast"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              onClick={captureFooterClick("GitHub", "https://github.com/AviOfLagos/zerocast", "bottom_bar")}
            >
              GitHub
            </a>
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
              onClick={captureFooterClick("Privacy", "/privacy", "bottom_bar")}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-white transition-colors"
              onClick={captureFooterClick("Terms", "/terms", "bottom_bar")}
            >
              Terms
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
