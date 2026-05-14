/* Launch-mode toggle.

   When NEXT_PUBLIC_LAUNCH_OPEN === "true" the marketing surface flips
   from "Private Beta — Request Access" to "Sign up free":

   - Primary CTAs render with label "Sign up free" and href "/login"
     (instead of "Request Access" and "?beta=true").
   - BetaModal short-circuits its form and redirects requests straight
     to /login instead of capturing wait-list submissions.

   To open the launch: set NEXT_PUBLIC_LAUNCH_OPEN=true in Vercel env
   for production. No code change required.

   Why NEXT_PUBLIC_: the value is read in both server components and
   client components (BetaModal is "use client"), so it must be exposed
   to the browser bundle. NEXT_PUBLIC_ flips happen at build time;
   redeploy after toggling. */

export const LAUNCH_OPEN: boolean =
  process.env.NEXT_PUBLIC_LAUNCH_OPEN === "true"

export const PRIMARY_CTA_HREF: string = LAUNCH_OPEN ? "/login" : "?beta=true"

export const PRIMARY_CTA_LABEL: string = LAUNCH_OPEN
  ? "Sign up free"
  : "Request Access"

export const SECONDARY_CTA_LABEL: string = LAUNCH_OPEN
  ? "Sign up"
  : "Join the Waitlist"
