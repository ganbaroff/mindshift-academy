import { currentUser } from "@clerk/nextjs/server";
import { isParentEmailAllowed } from "@/lib/parent-allowlist";

/**
 * Referral / invite access control.
 * MindShift Academy is invite-only and free — access is granted to specific
 * accounts the operator approves, not by payment.
 *
 * Control: legacy `ALLOWLIST_EMAILS` remains supported. New parent grants use
 * independent `ACADEMY_ALLOW_EMAIL_<SHA256(email)>=1` environment variables,
 * so adding one family never overwrites existing access.
 */
export function isEmailAllowed(email?: string | null): boolean {
  return isParentEmailAllowed(email);
}

/** Server-only: resolve the current Clerk user + whether they're allowed in. */
export async function getViewerAccess() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return { user, email, allowed: isEmailAllowed(email) };
}
