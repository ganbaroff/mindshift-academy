/**
 * Continue-path for signed-in visitors on "/" and "/enter-code".
 * Never returns child free-text. Auth required.
 */

import { NextResponse } from "next/server";
import { hasValidConsent } from "@/lib/consent";
import { isParentEmailAllowed } from "@/lib/parent-allowlist";
import { signedInContinuePath } from "@/lib/academy-access";
import { prisma } from "@/lib/prisma";
import { isCurriculumSessionComplete } from "@/lib/tasks/crystals";

const SESSION_ORDER = [
  "w1-s1", "w1-s2", "w1-s3",
  "w2-s1", "w2-s2", "w2-s3",
  "w3-s1", "w3-s2", "w3-s3",
  "w4-s1", "w4-s2", "w4-s3",
  "w5-s1", "w5-s2", "w5-s3",
] as const;

async function firstIncompleteSessionId(userId: string): Promise<string | null> {
  for (const id of SESSION_ORDER) {
    if (!(await isCurriculumSessionComplete(userId, id))) return id;
  }
  return null;
}

export async function GET(req: Request) {
  try {
    let clerkId: string | null = null;
    let email: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";

    if (isDev && testBypass) {
      clerkId = "test_user_id";
      email = "test@example.com";
    } else {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const session = await auth();
      clerkId = session.userId;
      if (clerkId) {
        const u = await currentUser();
        email = u?.emailAddresses?.[0]?.emailAddress ?? null;
      }
    }

    if (!clerkId) {
      return NextResponse.json({ signedIn: false, continue: null });
    }

    const allowed = isDev && testBypass ? true : isParentEmailAllowed(email ?? "");
    const consentValid = await hasValidConsent(clerkId);
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      include: { monster: true },
    });
    const hasMonster = Boolean(dbUser?.monster);
    const nextId = dbUser ? await firstIncompleteSessionId(dbUser.id) : "w1-s1";

    const cont = signedInContinuePath({
      signedIn: true,
      allowed,
      consentValid,
      hasMonster,
      nextSessionId: nextId,
    });

    return NextResponse.json({
      signedIn: true,
      allowed,
      consentValid,
      hasMonster,
      nextSessionId: nextId,
      continue: cont,
    });
  } catch (err) {
    console.error("continue route error:", err);
    return NextResponse.json({ error: "Внутренняя ошибка." }, { status: 500 });
  }
}
