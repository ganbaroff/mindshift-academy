import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewerAccess } from "@/lib/access";
import { hasValidConsent } from "@/lib/consent";

// Server gate for the client onboarding page. Unauthenticated users are handled
// by Clerk middleware; here we block signed-in accounts that aren't allowlisted.
// Demo preview (no signed-in user, dev-only via middleware) passes through.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await getViewerAccess();
  if (user && !allowed) {
    redirect("/no-access");
  }
  // COPPA (spec §5): naming/hatching the monster is child-authored data that /api/monster
  // persists, so — like the lesson gate — an allowlisted account must have valid parental
  // consent first. No-consent → /consent BEFORE the child invests in naming, rather than
  // letting them finish and bounce off a 403 at save time.
  if (user && !(await hasValidConsent(user.id))) {
    redirect("/consent");
  }
  return <>{children}</>;
}
