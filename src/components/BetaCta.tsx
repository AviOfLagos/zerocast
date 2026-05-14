"use client";

import Link from "next/link";
import posthog from "posthog-js";
import type { ReactNode } from "react";

interface BetaCtaProps {
  location: string;
  children: ReactNode;
  className?: string;
}

export function BetaCta({ location, children, className }: BetaCtaProps) {
  return (
    <Link
      href="?beta=true"
      scroll={false}
      className={className}
      onClick={() => {
        posthog.capture("cta_clicked", {
          cta_id: "request_beta",
          cta_location: location,
          page: typeof window !== "undefined" ? window.location.pathname : null,
        });
      }}
    >
      {children}
    </Link>
  );
}
