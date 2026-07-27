/**
 * Read released session content (no child data egress). Auth + consent required.
 * Includes passedTaskIds so the UI can show ✓ without replaying empty state.
 * Later sessions require prior sessionComplete (server gate).
 */

import { NextResponse } from "next/server";
import { hasValidConsent } from "@/lib/consent";
import { getSession, toPublicSession } from "@/content/curriculum";
import { prisma } from "@/lib/prisma";
import {
  listPassedTaskIds,
  ensureStarterCrystals,
  isCurriculumSessionComplete,
} from "@/lib/tasks/crystals";
import { nextSessionId, prerequisiteSessionId } from "@/lib/tasks/resolve-task";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    let clerkId: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";

    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
      const { auth } = await import("@clerk/nextjs/server");
      clerkId = (await auth()).userId;
    }

    if (!clerkId) {
      return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }
    if (!(isDev && testBypass) && !(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Нужно согласие родителя." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const session = getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Сессия не найдена." }, { status: 404 });
    }

    const dbUser = await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        username: clerkId,
        xp: 0,
        crystals: 0,
        streak: 0,
        activeStep: 1,
      },
    });

    const prereq = prerequisiteSessionId(id);
    if (prereq) {
      const unlocked = await isCurriculumSessionComplete(dbUser.id, prereq);
      if (!unlocked) {
        return NextResponse.json(
          {
            code: "SESSION_LOCKED",
            error: "Сначала заверши предыдущую сессию.",
            prerequisiteSessionId: prereq,
          },
          { status: 403 }
        );
      }
    }

    const crystals = await ensureStarterCrystals(dbUser.id);
    const passedTaskIds = await listPassedTaskIds(dbUser.id, id);
    const complete = await isCurriculumSessionComplete(dbUser.id, id);

    // Never ship hintRu until /api/hints/reveal spends crystals.
    // Collision targets stay in payload for post-fail reveal; UI hides until fail.
    return NextResponse.json({
      session: toPublicSession(session),
      passedTaskIds,
      crystals,
      sessionComplete: complete,
      nextSessionId: nextSessionId(id),
    });
  } catch (err) {
    console.error("tasks/session error:", err);
    return NextResponse.json({ error: "Внутренняя ошибка." }, { status: 500 });
  }
}
