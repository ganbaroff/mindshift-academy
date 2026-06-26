import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewerAccess } from "@/lib/access";

// Server gate for the client onboarding page. Unauthenticated users are handled
// by Clerk middleware; here we block signed-in accounts that aren't allowlisted.
// Demo preview (no signed-in user, dev-only via middleware) passes through.
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const { user, allowed } = await getViewerAccess();
  if (user && !allowed) {
    redirect("/no-access");
  }
  return <>{children}</>;
}
