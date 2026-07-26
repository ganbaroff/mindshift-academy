/**
 * Executable-task attempt: consent → rate limit → input moderation → interpret → execute → check.
 * Child free-text never reaches the interpreter before moderation. Interpreter never sees the target.
 * Model free-text never reaches the child (closed reason codes + whitelist actions).
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
import { resolveGridAttempt, resolveSequenceAttempt } from "@/lib/tasks/attempt";
import { persistTaskAttempt } from "@/lib/tasks/persist";
import type { Cell } from "@/lib/tasks/types";

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
        { code: "CONSENT_REQUIRED", message: "Parental consent required." },
        { status: 403 }
      );
    }

    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    const rl = await rateLimit("tasks", clerkId, 20, 10);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком много запросов, подожди немного." }, { status: 429 });
    }

    const parsed = attemptRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { family, utterance, target, concept, tier, eventId } = parsed.data;
    if (family === "grid-draw" && (!target || target.length === 0)) {
      return NextResponse.json({ error: "target required for grid-draw" }, { status: 400 });
    }
    if ((concept && !tier) || (!concept && tier)) {
      return NextResponse.json({ error: "concept and tier must be sent together" }, { status: 400 });
    }

    const safety = getSafetyClient();
    if (!safety) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
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

    // Sanitize for the model prompt; safety already saw the full utterance.
    const forModel = minimizeChildText(utterance);

    let interpreted;
    try {
      interpreted = await interpretUtterance(family, forModel);
    } catch (err) {
      const code = err instanceof Error ? err.message : "INTERPRET_FAILED";
      if (code === "NO_CHAT_PROVIDER") {
        return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
      }
      console.error("interpretUtterance failed:", err);
      return NextResponse.json({
        pass: false,
        feedback: "Монстр задумался. Связь потерялась — попробуй ещё раз.",
        safetyPassed: true,
        latencyMs: Date.now() - startedAt,
      });
    }

    const outcome =
      interpreted.family === "grid-draw"
        ? resolveGridAttempt(interpreted.program, target as Cell[])
        : resolveSequenceAttempt(interpreted.program);

    let mastery: number | null = null;
    let recorded: boolean | null = null;
    if (concept && tier) {
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
      const persisted = await persistTaskAttempt({
        userId: dbUser.id,
        concept,
        family,
        tier,
        pass: outcome.pass,
        eventId,
      });
      mastery = persisted.mastery;
      recorded = persisted.recorded;
    }

    return NextResponse.json({
      pass: outcome.pass,
      feedback: outcome.feedback,
      programStatus: outcome.programStatus,
      reasonCode: outcome.reasonCode ?? null,
      safetyPassed: true,
      model: interpreted.model,
      interpretLatencyMs: interpreted.latencyMs,
      latencyMs: Date.now() - startedAt,
      mastery,
      recorded,
      // Never echo the child's utterance or the raw model payload.
    });
  } catch (err) {
    console.error("tasks/attempt error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
