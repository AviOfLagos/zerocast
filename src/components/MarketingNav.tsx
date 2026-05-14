"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, Suspense } from "react";
import { Zap, Menu, X } from "lucide-react";
import posthog from "posthog-js";

const captureNavClick = (label: string, href: string) => () => {
  posthog.capture("marketing_nav_clicked", {
    link_label: label,
    link_href: href,
  });
};

const navLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/compare/streamyard-alternative", label: "Compare" },
  { href: "/blog", label: "Blog" },
];

function NavContent() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 group"
          onClick={captureNavClick("Zerocast (logo)", "/")}
        >
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center group-hover:bg-brand transition-colors">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Zerocast</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-white"
                  : "text-ink-subtle hover:text-white"
              }`}
              onClick={captureNavClick(link.label, link.href)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-ink-muted hover:text-white transition-colors"
            onClick={captureNavClick("Sign In", "/login")}
          >
            Sign In
          </Link>
          <Link
            href="?beta=true"
            scroll={false}
            className="text-sm font-bold bg-white text-ink-inverse hover:bg-brand-on-light px-5 py-2 rounded-full transition-all"
            onClick={captureNavClick("Join Beta", "?beta=true")}
          >
            Join Beta
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-ink-muted hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-surface px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block text-ink-muted hover:text-white text-sm font-medium transition-colors"
              onClick={() => {
                captureNavClick(link.label, link.href)();
                setMenuOpen(false);
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
            <Link
              href="/login"
              className="text-sm text-ink-muted"
              onClick={captureNavClick("Sign In", "/login")}
            >
              Sign In
            </Link>
            <Link
              href="?beta=true"
              scroll={false}
              className="text-sm font-bold bg-white text-ink-inverse px-5 py-2.5 rounded-full text-center"
              onClick={captureNavClick("Join Beta", "?beta=true")}
            >
              Join Beta
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function MarketingNav() {
  return (
    <Suspense fallback={
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-white/5 h-16" />
    }>
      <NavContent />
    </Suspense>
  );
}
