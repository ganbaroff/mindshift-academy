/**
 * Executable-task attempt: consent → rate limit → input moderation → interpret → execute → check.
 * Child free-text never reaches the interpreter before moderation. Interpreter never sees the target.
 * Model free-text never reaches the child (closed reason codes + whitelist actions).
 * Target/family/tier come from server curriculum — never from the client body.
 */

import { NextResponse } from "next/server";
import { hasValidConsent } from "@/lib/consent";
import { moderate } from "@/lib/moderation";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { minimizeChildText } from "@/lib/privacy";
import { getGuardClient, getSafetyClient } from "@/lib/ai-provider";
import { prisma } from "@/lib/prisma";
import { attemptRequestSchema } from "@/lib/tasks/schemas";
import { interpretUtterance } from "@/lib/tasks/interpreter";
import {
  resolveClaimAttempt,
  resolveGridAttempt,
  resolvePatternAttempt,
  resolveRuleAttempt,
  resolveSequenceAttempt,
} from "@/lib/tasks/attempt";
import { persistTaskAttempt } from "@/lib/tasks/persist";
import { awardTaskPassCrystals, ensureStarterCrystals, isCurriculumSessionComplete } from "@/lib/tasks/crystals";
import { resolveCurriculumTask } from "@/lib/tasks/resolve-task";
import { selectOfferedTier, effectiveTaskTier } from "@/lib/tasks/tier-select";
import {
  awardSessionMilestoneCrystals,
  awardWeeklyCosmeticIfReady,
} from "@/lib/milestone-awards";
import { WEEK_SESSIONS } from "@/lib/evolution";
import type { Cell, GridProgram, SequenceProgram } from "@/lib/tasks/types";
import type { RuleProgram } from "@/lib/tasks/rule-runner";
import type { PatternProgram } from "@/lib/tasks/pattern-expand";
import type { ClaimCheckProgram } from "@/lib/tasks/claim-check";

export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    let clerkId: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";

    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
      const { auth } = await import("@clerk/nextjs/server");
      const session = await auth();
      clerkId = session.userId;
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
    const rl = await rateLimit("tasks", clerkId, 20, 10);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком много запросов, подожди немного." }, { status: 429 });
    }

    const parsed = attemptRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Неверный запрос." }, { status: 400 });
    }

    const { utterance, eventId, sessionId, taskId } = parsed.data;
    const resolved = resolveCurriculumTask(sessionId, taskId);
    if (!resolved) {
      return NextResponse.json(
        { error: "Задание не найдено.", code: "TASK_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { session, task } = resolved;
    const family = task.family;
    const concept = session.concept;
    const target = task.target as Cell[] | undefined;

    if (family === "grid-draw" && (!target || target.length === 0)) {
      return NextResponse.json({ error: "У задания нет цели на сервере." }, { status: 500 });
    }
    if (family === "rule-runner" && (!task.ruleMaps || task.ruleMaps.length === 0)) {
      return NextResponse.json({ error: "У задания нет карт на сервере." }, { status: 500 });
    }
    if (family === "pattern-expand" && (!task.patternExpected || task.patternExpected.length === 0)) {
      return NextResponse.json({ error: "У задания нет эталона узора на сервере." }, { status: 500 });
    }
    if (family === "claim-check" && (!task.claims || task.claims.length === 0)) {
      return NextResponse.json({ error: "У задания нет утверждений на сервере." }, { status: 500 });
    }

    const safety = getSafetyClient();
    if (!safety) {
      return NextResponse.json({ error: "Сервис временно недоступен." }, { status: 503 });
    }

    const inMod = await moderate(getGuardClient(), safety.client, safety.model, utterance);
    if (!inMod.safe) {
      return NextResponse.json({
        pass: false,
        feedback: "Монстр задумался и просит сказать по-другому, более спокойно.",
        safetyPassed: false,
        latencyMs: Date.now() - startedAt,
      });
    }

    const forModel = minimizeChildText(utterance);

    let interpreted;
    try {
      interpreted = await interpretUtterance(family, forModel);
    } catch (err) {
      const code = err instanceof Error ? err.message : "INTERPRET_FAILED";
      if (code === "NO_CHAT_PROVIDER") {
        return NextResponse.json({ error: "Сервис временно недоступен." }, { status: 503 });
      }
      console.error("interpretUtterance failed:", err);
      return NextResponse.json({
        pass: false,
        feedback: "Монстр задумался. Связь потерялась — попробуй ещё раз.",
        safetyPassed: true,
        latencyMs: Date.now() - startedAt,
      });
    }

    if (interpreted.family !== family) {
      return NextResponse.json({ error: "Неверный тип задания." }, { status: 400 });
    }

    const outcome =
      family === "grid-draw"
        ? resolveGridAttempt(interpreted.program as GridProgram, target as Cell[], {
            hideTargetPanel: task.role === "collision",
          })
        : family === "sequence-world"
          ? resolveSequenceAttempt(interpreted.program as SequenceProgram)
          : family === "rule-runner"
            ? resolveRuleAttempt(interpreted.program as RuleProgram, task.ruleMaps!)
            : family === "pattern-expand"
              ? resolvePatternAttempt(
                  interpreted.program as PatternProgram,
                  task.patternExpected!,
                  task.patternExpandCount
                )
              : resolveClaimAttempt(interpreted.program as ClaimCheckProgram, task.claims!);

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

    const masteryRow = await prisma.conceptMastery.findUnique({
      where: { userId_concept: { userId: dbUser.id, concept } },
      select: { mastery: true },
    });
    const offeredTier = selectOfferedTier(masteryRow?.mastery ?? 0);
    const tier = effectiveTaskTier(task.tier, offeredTier, task.role);

    const persisted = await persistTaskAttempt({
      userId: dbUser.id,
      concept,
      family,
      tier,
      pass: outcome.pass,
      eventId,
      sessionId,
      taskId,
    });

    await ensureStarterCrystals(dbUser.id);

    let crystals: number;
    let crystalsAwarded = false;
    if (outcome.pass) {
      const award = await awardTaskPassCrystals({
        userId: dbUser.id,
        sessionId,
        taskId,
      });
      crystals = award.crystals;
      crystalsAwarded = award.awarded;

      // Milestone chest: fixed session-tier crystals when the session gate closes.
      const sessionDone = await isCurriculumSessionComplete(dbUser.id, sessionId);
      if (sessionDone) {
        const chest = await awardSessionMilestoneCrystals({
          userId: dbUser.id,
          sessionId,
          tier,
        });
        crystals = chest.crystals;
        if (chest.awarded) crystalsAwarded = true;

        const completed: string[] = [];
        for (const week of [1, 2, 3, 4, 5] as const) {
          for (const sid of WEEK_SESSIONS[week]) {
            if (await isCurriculumSessionComplete(dbUser.id, sid)) completed.push(sid);
          }
          await awardWeeklyCosmeticIfReady({
            userId: dbUser.id,
            week,
            completedSessionIds: completed,
          });
        }
      }
    } else {
      const cur = await prisma.user.findUnique({
        where: { id: dbUser.id },
        select: { crystals: true },
      });
      crystals = cur?.crystals ?? 0;
    }

    return NextResponse.json({
      pass: outcome.pass,
      feedback: outcome.feedback,
      programStatus: outcome.programStatus,
      reasonCode: outcome.reasonCode ?? null,
      filledCells: outcome.filledCells ?? null,
      missingCells: outcome.missingCells ?? null,
      extraCells: outcome.extraCells ?? null,
      safetyPassed: true,
      model: interpreted.model,
      interpretLatencyMs: interpreted.latencyMs,
      latencyMs: Date.now() - startedAt,
      mastery: persisted.mastery,
      recorded: persisted.recorded,
      crystals,
      crystalsAwarded,
      // Never echo utterance, client target, or raw model payload.
    });
  } catch (err) {
    console.error("tasks/attempt error:", err);
    return NextResponse.json({ error: "Внутренняя ошибка." }, { status: 500 });
  }
}
