import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { parentConsentRedirect } from "@/lib/academy-access";
import { getViewerAccess } from "@/lib/access";

/** Server boundary for the adult-only, allowlisted consent journey. */
export default async function ConsentLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await getViewerAccess();
  const destination = parentConsentRedirect({ signedIn: Boolean(user), allowed });
  if (destination) redirect(destination);
  return <>{children}</>;
}
