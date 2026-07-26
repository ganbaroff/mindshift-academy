import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewerAccess } from "@/lib/access";
import { hasValidConsent } from "@/lib/consent";
import { academyEntryRedirect } from "@/lib/academy-access";

// Server gate for the client onboarding page. Unauthenticated users are handled
// by Clerk middleware; here we block signed-in accounts that aren't allowlisted.
// Demo preview (no signed-in user, dev-only via middleware) passes through.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await getViewerAccess();
  const destination = academyEntryRedirect({
    signedIn: Boolean(user),
    allowed,
    // Naming a pet persists child data, so lack of valid consent redirects before
    // the child starts onboarding. Keep allowlist denial ahead of this lookup.
    consentValid: user && allowed ? await hasValidConsent(user.id) : false,
  });
  if (destination) redirect(destination);
  return <>{children}</>;
}
