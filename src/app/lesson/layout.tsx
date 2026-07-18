import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewerAccess } from "@/lib/access";
import { hasValidConsent } from "@/lib/consent";

// Server gate for the client lesson pages. Unauthenticated users are handled
// by Clerk middleware; here we block signed-in accounts that aren't allowlisted.
// Demo preview (no signed-in user, dev-only via middleware) passes through.
export default async function LessonLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await getViewerAccess();
  if (user && !allowed) {
    redirect("/no-access");
  }
  // COPPA (spec §5): an allowlisted, signed-in account still cannot enter the child
  // learning surface until the parent has given valid consent. Fail-closed → /consent,
  // so the lesson/chat never renders a screen whose /api/chat call will just 403.
  if (user && !(await hasValidConsent(user.id))) {
    redirect("/consent");
  }
  return <>{children}</>;
}
