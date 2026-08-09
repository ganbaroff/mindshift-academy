/**
 * `/continue` — the resume door.
 *
 * Defect 2 (`docs/architecture/08-UX-MONSTER-JOURNEY.md` §1): a returning child landed
 * on step 1 because the dashboard CTA and onboarding both linked to `/session/w1-s1`.
 * The resolver that knows the right session already existed but only spoke JSON.
 * This page gives that answer a URL, so every entry point can link to "where I am"
 * without knowing how to compute it.
 *
 * Server component: resolves, redirects, renders nothing a child ever sees.
 */

import { redirect } from "next/navigation";
import { getViewerAccess } from "@/lib/access";
import { hasValidConsent } from "@/lib/consent";
import { signedInContinuePath } from "@/lib/academy-access";
import { prisma } from "@/lib/prisma";
import { isCurriculumSessionComplete } from "@/lib/tasks/crystals";
import { resolveFirstIncompleteSession } from "@/lib/tasks/course-map";

export const dynamic = "force-dynamic";

export default async function ContinuePage() {
  const { user, allowed } = await getViewerAccess();

  if (!user) redirect("/sign-in");
  if (!allowed) redirect("/no-access");
  if (!(await hasValidConsent(user.id))) redirect("/consent");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { monster: true },
  });

  if (!dbUser || !dbUser.monster) redirect("/onboarding");

  const nextSessionId = await resolveFirstIncompleteSession((sessionId) =>
    isCurriculumSessionComplete(dbUser.id, sessionId)
  );

  const destination = signedInContinuePath({
    signedIn: true,
    allowed: true,
    consentValid: true,
    hasMonster: true,
    nextSessionId,
  });

  redirect(destination?.href ?? "/dashboard");
}
