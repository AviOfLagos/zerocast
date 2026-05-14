"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

/**
 * Bridges NextAuth session state to PostHog identity.
 *
 * On unauthenticated → authenticated transition:
 *   1. posthog.alias(userId, anonymousDistinctId)  — merge anon session into user
 *   2. posthog.identify(userId, { email, name })   — attach user properties
 *   3. posthog.capture("login_succeeded", ...)     — single fire per session change
 *
 * On authenticated → unauthenticated transition:
 *   - posthog.reset() — clear identity and start a fresh anonymous distinct_id
 *
 * Idempotent across renders via a ref guard on userId.
 *
 * NOTE: provider name is not available client-side from useSession() unless the
 * NextAuth session callback is extended to surface it. Hard-coded as "next-auth"
 * for now — flagged in the A2.3 manifest for follow-up.
 */
export function PostHogIdentify() {
  const { data: session, status } = useSession();
  const lastIdentifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const userId = session?.user?.id;

    if (userId && lastIdentifiedRef.current !== userId) {
      // Alias anonymous distinct_id → userId BEFORE identify, per event taxonomy §3.
      const anonymousId = posthog.get_distinct_id();
      if (anonymousId && anonymousId !== userId) {
        posthog.alias(userId, anonymousId);
      }

      posthog.identify(userId, {
        email: session?.user?.email ?? undefined,
        name: session?.user?.name ?? undefined,
      });

      posthog.capture("login_succeeded", {
        provider: "next-auth",
      });

      lastIdentifiedRef.current = userId;
      return;
    }

    if (!userId && lastIdentifiedRef.current !== null) {
      // Signed out — reset to fresh anonymous distinct_id.
      posthog.reset();
      lastIdentifiedRef.current = null;
    }
  }, [session, status]);

  return null;
}

export default PostHogIdentify;
