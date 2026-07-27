import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewerAccess } from "@/lib/access";
import { hasValidConsent } from "@/lib/consent";
import { academyEntryRedirect } from "@/lib/academy-access";

export default async function SessionLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await getViewerAccess();
  const destination = academyEntryRedirect({
    signedIn: Boolean(user),
    allowed,
    consentValid: user && allowed ? await hasValidConsent(user.id) : false,
  });
  if (destination) redirect(destination);
  return <>{children}</>;
}
