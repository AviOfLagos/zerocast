import { auth } from "@/auth";

/* Admin allow-list. Extend by appending an email here.
   Used by /admin/* layout gate + /adminos sign-in page + admin API routes. */
const ADMIN_EMAILS = new Set<string>([
  "ellumainc@gmail.com",
  "avioflagos@gmail.com",
  "avi@nexprove.com",
  "dev@localhost", // dev test user — only resolvable on local
]);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email);
}

export async function requireAdmin(): Promise<
  | { ok: true; email: string }
  | { ok: false; reason: "unauthenticated" | "forbidden"; email: string | null }
> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email) return { ok: false, reason: "unauthenticated", email: null };
  if (!isAdminEmail(email)) return { ok: false, reason: "forbidden", email };
  return { ok: true, email };
}
