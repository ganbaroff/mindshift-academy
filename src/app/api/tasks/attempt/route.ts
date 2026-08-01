/**
 * Executable-task attempt: consent → rate limit → input moderation → interpret → execute → check.
 * Child free-text never reaches the interpreter before moderation. Interpreter never sees the target.
 * Model free-text never reaches the child (closed reason codes + whitelist actions).
 * Target/family/tier come from server curriculum — never from the client body.
 * Section 3A.4: FAKE_AI / FAKE_AI_MODE use deterministic fake provider in CI.
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
import { fakeInterpretUtterance } from "@/lib/tasks/fake-interpreter";
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
import {
  buildChoiceOptions,
  programForChoice,
} from "@/lib/tasks/choice-mode";
import { getFakeAiMode, shouldUseFakeInterpreter, CANNED_TUTOR_ENCOURAGEMENT } from "@/lib/fake-ai";
import { recordDegradeEvent } from "@/lib/degrade-events";
import { estimateTokens, recordSessionCost, SESSION_TOKEN_BUDGET } from "@/lib/session-cost";
import { Errors } from "@/lib/errors";
import type { Cell, GridProgram, SequenceProgram } from "@/lib/tasks/types";
import type { RuleProgram } from "@/lib/tasks/rule-runner";
import type { PatternProgram } from "@/lib/tasks/pattern-expand";
import type { ClaimCheckProgram } from "@/lib/tasks/claim-check";

export async function POST(req: Request) {
  const startedAt = Date.now();
  const fakeMode = getFakeAiMode();

  try {
    let clerkId: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";
    const fakeActive = shouldUseFakeInterpreter(fakeMode) || (isDev && testBypass && process.env.FAKE_AI !== "0");

    if (testBypass && !isDev) {
      return NextResponse.json({ error: Errors.bypassUnavailable }, { status: 403 });
    }

    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
      try {
        const { auth } = await import("@clerk/nextjs/server");
        const session = await auth();
        clerkId = session.userId;
      } catch {
        return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
      }
    }

    if (!clerkId) {
      return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
    }

    if (!(isDev && testBypass) && !(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: Errors.consentRequired },
        { status: 403 }
      );
    }

    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
    }
    const rl = await rateLimit("tasks", clerkId, 20, 10);
    if (!rl.success) {
      return NextResponse.json({ error: Errors.rateLimited }, { status: 429 });
    }

    const parsed = attemptRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: Errors.badRequest }, { status: 400 });
    }

    const { utterance, choiceId, eventId, sessionId, taskId } = parsed.data;
    const resolved = resolveCurriculumTask(sessionId, taskId);
    if (!resolved) {
      return NextResponse.json(
        { error: Errors.taskNotFound, code: "TASK_NOT_FOUND" },
        { status: 404 }
      );
    }

    const { session, task } = resolved;
    const family = task.family;
    const concept = session.concept;
    const target = task.target as Cell[] | undefined;

    if (family === "grid-draw" && (!target || target.length === 0)) {
      return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
    }
    if (family === "rule-runner" && (!task.ruleMaps || task.ruleMaps.length === 0)) {
      return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
    }
    if (family === "pattern-expand" && (!task.patternExpected || task.patternExpected.length === 0)) {
      return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
    }
    if (family === "claim-check" && (!task.claims || task.claims.length === 0)) {
      return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
    }

    // Provider degradation never exposes an answer-bearing assessed fallback.
    if (fakeMode === "tutor_down" && !choiceId) {
      await recordDegradeEvent({
        lessonId: sessionId,
        providerStage: "tutor",
        causeEnum: "provider_down",
        resolvedByFallback: true,
      });
      return NextResponse.json({
        pass: false,
        feedback: CANNED_TUTOR_ENCOURAGEMENT,
        programStatus: "unclear",
        safetyPassed: true,
        choiceMode: false,
        choices: buildChoiceOptions(task),
        latencyMs: Date.now() - startedAt,
      });
    }

    // Legacy choice requests are fail-closed; programForChoice derives no answers.
    if (choiceId) {
      const program = programForChoice(task, choiceId);
      if (!program || program.status !== "ok") {
        return NextResponse.json({ error: Errors.badRequest, code: "BAD_CHOICE" }, { status: 400 });
      }
      const outcome = resolveProgram(family, program, task, target);
      return finalizeAttempt({
        clerkId,
        concept,
        family,
        tierAuthored: task.tier,
        role: task.role,
        outcome,
        eventId,
        sessionId,
        taskId,
        startedAt,
        model: "choice-mode",
        interpretLatencyMs: 0,
        promptTokens: 0,
        completionTokens: 0,
        choiceModeUsed: true,
      });
    }

    // Moderation — fake moderation_error refuses; bypass/fake-ok skips live classifiers.
    if (fakeMode === "moderation_error") {
      await recordDegradeEvent({
        lessonId: sessionId,
        providerStage: "moderation",
        causeEnum: "moderation_error",
        resolvedByFallback: false,
      });
      return NextResponse.json({
        pass: false,
        feedback: "Монстр задумался и просит сказать по-другому, более спокойно.",
        safetyPassed: false,
        latencyMs: Date.now() - startedAt,
      });
    }

    if (!(fakeActive && (isDev && testBypass))) {
      const safety = getSafetyClient();
      if (!safety) {
        return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
      }
      const inMod = await moderate(
        getGuardClient(),
        safety.client,
        safety.model,
        utterance
      );
      if (!inMod.safe) {
        return NextResponse.json({
          pass: false,
          feedback: "Монстр задумался и просит сказать по-другому, более спокойно.",
          safetyPassed: false,
          latencyMs: Date.now() - startedAt,
        });
      }
    }

    const forModel = minimizeChildText(utterance);

    // Interpreter down: pause safely until deterministic task surfaces take over.
    if (fakeMode === "interpreter_down") {
      await recordDegradeEvent({
        lessonId: sessionId,
        providerStage: "interpreter",
        causeEnum: "provider_down",
        resolvedByFallback: true,
      });
      return NextResponse.json({
        pass: false,
        feedback: "Монстрик сейчас не может разобрать слова. Прогресс сохранён — попробуй немного позже.",
        programStatus: "unclear",
        safetyPassed: true,
        choiceMode: false,
        choices: buildChoiceOptions(task),
        latencyMs: Date.now() - startedAt,
      });
    }

    type Interpreted = {
      family: typeof family;
      program: GridProgram | SequenceProgram | RuleProgram | PatternProgram | ClaimCheckProgram;
      model: string;
      latencyMs: number;
    };

    let interpreted: Interpreted;
    try {
      if (fakeActive || fakeMode === "ok") {
        const program = fakeInterpretUtterance(family, forModel);
        interpreted = {
          family,
          program: program as Interpreted["program"],
          model: "fake-interpreter",
          latencyMs: 0,
        };
      } else {
        const live = await interpretUtterance(family, forModel);
        interpreted = {
          family: live.family,
          program: live.program as Interpreted["program"],
          model: live.model,
          latencyMs: live.latencyMs,
        };
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "INTERPRET_FAILED";
      if (code === "NO_CHAT_PROVIDER") {
        return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
      }
      console.error("interpretUtterance failed:", err);
      await recordDegradeEvent({
        lessonId: sessionId,
        providerStage: "interpreter",
        causeEnum: "unknown",
        resolvedByFallback: true,
      });
      return NextResponse.json({
        pass: false,
        feedback: "Монстрик сейчас не может разобрать слова. Прогресс сохранён — попробуй немного позже.",
        programStatus: "unclear",
        safetyPassed: true,
        choiceMode: false,
        choices: buildChoiceOptions(task),
        latencyMs: Date.now() - startedAt,
      });
    }

    if (interpreted.family !== family) {
      return NextResponse.json({ error: "Неверный тип задания." }, { status: 400 });
    }

    const outcome = resolveProgram(family, interpreted.program, task, target);
    const promptTokens = estimateTokens(forModel);
    const completionTokens = 40;

    return finalizeAttempt({
      clerkId,
      concept,
      family,
      tierAuthored: task.tier,
      role: task.role,
      outcome,
      eventId,
      sessionId,
      taskId,
      startedAt,
      model: interpreted.model,
      interpretLatencyMs: interpreted.latencyMs,
      promptTokens,
      completionTokens,
      choiceModeUsed: false,
    });
  } catch (err) {
    console.error("tasks/attempt error:", err);
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}

function resolveProgram(
  family: string,
  program: GridProgram | SequenceProgram | RuleProgram | PatternProgram | ClaimCheckProgram,
  task: { role: string; ruleMaps?: unknown; patternExpected?: string[]; patternExpandCount?: number; claims?: unknown },
  target: Cell[] | undefined
) {
  return family === "grid-draw"
    ? resolveGridAttempt(program as GridProgram, target as Cell[], {
        hideTargetPanel: task.role === "collision",
      })
    : family === "sequence-world"
      ? resolveSequenceAttempt(program as SequenceProgram)
      : family === "rule-runner"
        ? resolveRuleAttempt(program as RuleProgram, task.ruleMaps as never)
        : family === "pattern-expand"
          ? resolvePatternAttempt(
              program as PatternProgram,
              task.patternExpected!,
              task.patternExpandCount
            )
          : resolveClaimAttempt(program as ClaimCheckProgram, task.claims as never);
}

async function finalizeAttempt(params: {
  clerkId: string;
  concept: string;
  family: string;
  tierAuthored: 1 | 2 | 3;
  role: "collision" | "practice" | "prediction" | "transfer" | string;
  outcome: {
    pass: boolean;
    feedback: string;
    programStatus: "ok" | "unclear";
    reasonCode?: string;
    filledCells?: Cell[];
    missingCells?: Cell[];
    extraCells?: Cell[];
  };
  eventId: string;
  sessionId: string;
  taskId: string;
  startedAt: number;
  model: string;
  interpretLatencyMs: number;
  promptTokens: number;
  completionTokens: number;
  choiceModeUsed: boolean;
}) {
  const dbUser = await prisma.user.upsert({
    where: { clerkId: params.clerkId },
    update: {},
    create: {
      clerkId: params.clerkId,
      username: params.clerkId,
      xp: 0,
      crystals: 0,
      streak: 0,
      activeStep: 1,
    },
  });

  let cost = {
    promptTokens: 0,
    completionTokens: 0,
    costMicros: 0,
    overBudget: false,
  };
  try {
    cost = await recordSessionCost({
      userId: dbUser.id,
      sessionId: params.sessionId,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
    });
  } catch (err) {
    // Local/dev DBs may lag additive migrations — never block learning on meter write.
    console.error("sessionCost write skipped:", err);
  }

  if (cost.overBudget && !params.choiceModeUsed && !params.outcome.pass) {
    // Over budget: pause safely; never synthesize a passing answer.
    return NextResponse.json({
      pass: false,
      feedback: "Монстрик устал считать слова. Прогресс сохранён — продолжим немного позже.",
      programStatus: "unclear",
      safetyPassed: true,
      choiceMode: false,
      choices: buildChoiceOptions(
        resolveCurriculumTask(params.sessionId, params.taskId)!.task
      ),
      sessionCost: {
        promptTokens: cost.promptTokens,
        completionTokens: cost.completionTokens,
        budget: SESSION_TOKEN_BUDGET,
        overBudget: true,
      },
      latencyMs: Date.now() - params.startedAt,
    });
  }

  const masteryRow = await prisma.conceptMastery.findUnique({
    where: { userId_concept: { userId: dbUser.id, concept: params.concept } },
    select: { mastery: true },
  });
  const offeredTier = selectOfferedTier(masteryRow?.mastery ?? 0);
  const role =
    params.role === "collision" ||
    params.role === "practice" ||
    params.role === "prediction" ||
    params.role === "transfer"
      ? params.role
      : "practice";
  const tier = effectiveTaskTier(params.tierAuthored, offeredTier, role);

  const persisted = await persistTaskAttempt({
    userId: dbUser.id,
    concept: params.concept,
    family: params.family,
    tier,
    pass: params.outcome.pass,
    eventId: params.eventId,
    sessionId: params.sessionId,
    taskId: params.taskId,
  });

  await ensureStarterCrystals(dbUser.id);

  let crystals: number;
  let crystalsAwarded = false;
  if (params.outcome.pass) {
    const award = await awardTaskPassCrystals({
      userId: dbUser.id,
      sessionId: params.sessionId,
      taskId: params.taskId,
    });
    crystals = award.crystals;
    crystalsAwarded = award.awarded;

    const sessionDone = await isCurriculumSessionComplete(dbUser.id, params.sessionId);
    if (sessionDone) {
      const chest = await awardSessionMilestoneCrystals({
        userId: dbUser.id,
        sessionId: params.sessionId,
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
    pass: params.outcome.pass,
    feedback: params.outcome.feedback,
    programStatus: params.outcome.programStatus,
    reasonCode: params.outcome.reasonCode ?? null,
    filledCells: params.outcome.filledCells ?? null,
    missingCells: params.outcome.missingCells ?? null,
    extraCells: params.outcome.extraCells ?? null,
    safetyPassed: true,
    model: params.model,
    interpretLatencyMs: params.interpretLatencyMs,
    latencyMs: Date.now() - params.startedAt,
    mastery: persisted.mastery,
    recorded: persisted.recorded,
    crystals,
    crystalsAwarded,
    sessionCost: {
      promptTokens: cost.promptTokens,
      completionTokens: cost.completionTokens,
      budget: SESSION_TOKEN_BUDGET,
      overBudget: cost.overBudget,
    },
  });
}
