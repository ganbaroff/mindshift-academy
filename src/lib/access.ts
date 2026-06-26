import { currentUser } from "@clerk/nextjs/server";

/**
 * Referral / invite access control.
 * MindShift Academy is invite-only and free — access is granted to specific
 * accounts the operator approves, not by payment.
 *
 * Control: set ALLOWLIST_EMAILS in env to a comma-separated list of approved
 * emails (the account "they give you"). Add an email -> that account gets in.
 */
function parseAllowlist(): string[] {
  return (process.env.ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email?: string | null): boolean {
  const list = parseAllowlist();
  // Fail-safe: no list configured = open in dev, CLOSED in production.
  // (An invite-only product must not fall open if the env var is forgotten.)
  if (list.length === 0) {
    return process.env.NODE_ENV !== "production";
  }
  if (!email) return false;
  return list.includes(email.toLowerCase());
}

/** Server-only: resolve the current Clerk user + whether they're allowed in. */
export async function getViewerAccess() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return { user, email, allowed: isEmailAllowed(email) };
}
