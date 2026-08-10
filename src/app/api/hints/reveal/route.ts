/**
 * Reveal a scaffold hint for HINT_CRYSTAL_COST crystals.
 * Returns how to speak — never the target cells.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { hasValidConsent } from "@/lib/consent";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { getSession, HINT_CRYSTAL_COST } from "@/content/curriculum";
import { spendCrystalsForHint, hasHintUnlocked, ensureStarterCrystals } from "@/lib/tasks/crystals";
import { hintCostFor, isStuckOnTask } from "@/lib/tasks/stuck";
import { uxV11Enabled } from "@/lib/ux-flags";

const bodySchema = z.object({
  sessionId: z.string().min(1).max(64),
  taskId: z.string().min(1).max(64),
});

export async function POST(req: Request) {
  try {
    let clerkId: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";

    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
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

    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Сервис временно недоступен." }, { status: 503 });
    }
    const rl = await rateLimit("hints", clerkId, 30, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком много запросов, подожди немного." }, { status: 429 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Неверный запрос." }, { status: 400 });
    }

    const { sessionId, taskId } = parsed.data;
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Сессия не найдена." }, { status: 404 });
    }
    const task = session.tasks.find((t) => t.id === taskId);
    if (!task?.hintRu?.trim()) {
      return NextResponse.json({ error: "Подсказка недоступна." }, { status: 404 });
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
    await ensureStarterCrystals(dbUser.id);
    const balanceUser = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: { id: true, crystals: true },
    });
    if (!balanceUser) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 500 });
    }

    if (await hasHintUnlocked(balanceUser.id, sessionId, taskId)) {
      return NextResponse.json({
        ok: true,
        alreadyOwned: true,
        hintRu: task.hintRu,
        cost: HINT_CRYSTAL_COST,
        crystals: balanceUser.crystals,
      });
    }

    /**
     * The stuck child pays nothing (08-UX-MONSTER-JOURNEY §10.1). Decided here, from
     * recorded misses — a client that claims to be stuck proves nothing. The unlock
     * still goes through the same idempotent ledger event, so a replay is free of
     * side effects whether the price was 5 or 0.
     */
    const failedAttempts = uxV11Enabled()
      ? await prisma.taskAttempt.count({
          where: { userId: balanceUser.id, sessionId, taskId, pass: false },
        })
      : 0;
    const cost = hintCostFor(failedAttempts, HINT_CRYSTAL_COST);

    const spent = await spendCrystalsForHint({
      userId: balanceUser.id,
      sessionId,
      taskId,
      cost,
    });

    if (!spent.ok) {
      return NextResponse.json(
        {
          error: "Не хватает кристаллов для подсказки.",
          code: "INSUFFICIENT_CRYSTALS",
          crystals: spent.crystals,
          cost,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyOwned: spent.alreadyOwned,
      hintRu: task.hintRu,
      cost,
      free: isStuckOnTask(failedAttempts),
      crystals: spent.crystals,
    });
  } catch (err) {
    console.error("hints/reveal error:", err);
    return NextResponse.json({ error: "Что-то пошло не так. Попробуй ещё раз!" }, { status: 500 });
  }
}
