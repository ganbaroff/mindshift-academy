import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewerAccess } from "@/lib/access";
import { hasValidConsent } from "@/lib/consent";
import { academyEntryRedirect } from "@/lib/academy-access";

// Server gate for the client lesson pages. Unauthenticated users are handled
// by Clerk middleware; here we block signed-in accounts that aren't allowlisted.
// Demo preview (no signed-in user, dev-only via middleware) passes through.
export default async function LessonLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await getViewerAccess();
  const destination = academyEntryRedirect({
    signedIn: Boolean(user),
    allowed,
    // Only query consent after allowlisting. This preserves the priority of the
    // access-denied screen and avoids a needless database request for strangers.
    consentValid: user && allowed ? await hasValidConsent(user.id) : false,
  });
  if (destination) redirect(destination);
  return <>{children}</>;
}
