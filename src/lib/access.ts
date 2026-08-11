import { headers } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { isParentEmailAllowed } from "@/lib/parent-allowlist";
import { hasDevTestBypass } from "@/lib/request-access";

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

/** Everything any caller of `getViewerAccess` actually reads off the viewer. */
export type Viewer = { id: string };

/** Matches the clerkId the API routes already use under the same dev-only seam. */
const TEST_BYPASS_VIEWER: Viewer = { id: "test_user_id" };

/** Server-only: resolve the current Clerk user + whether they're allowed in. */
export async function getViewerAccess(): Promise<{
  user: Viewer | null;
  email: string | null;
  allowed: boolean;
}> {
  // Dev-only test seam — the SAME one every API route already uses, deliberately not a
  // second definition. `hasDevTestBypass` requires NODE_ENV === "development" AND an
  // explicit `x-test-bypass` header, and the browser gate asserts it returns false for
  // "production" before it runs anything else.
  //
  // Why a page needs it at all: without it no automated run can reach a screen behind
  // Clerk. `/map` shipped and lived in production for a week with a machine having never
  // rendered it once — the only proof it worked was a founder's screenshot. A screen no
  // gate can see is a screen that regresses silently.
  if (hasDevTestBypass(await headers())) {
    return { user: TEST_BYPASS_VIEWER, email: null, allowed: true };
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return { user: user ? { id: user.id } : null, email, allowed: isEmailAllowed(email) };
}
