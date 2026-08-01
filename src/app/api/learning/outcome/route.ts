import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasValidConsent } from "@/lib/consent";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import {
  atlasOutcome,
  AtlasAdapterError,
} from "@/lib/atlas-learning/adapter.server";
import { Errors } from "@/lib/errors";

const outcomeBodySchema = z.object({
  idempotencyKey: z.string().min(1),
  learnerId: z.string().min(1).optional(),
  correct: z.boolean(),
  completed: z.boolean().default(true),
  responseTimeSec: z.number().min(0).default(15),
  selfReportedConfidence: z.number().min(0).max(1).optional(),
});

async function resolveUser(req: Request) {
  const isDev = process.env.NODE_ENV === "development";
  const testBypass = req.headers.get("x-test-bypass") === "true";
  const { auth } = await import("@clerk/nextjs/server");
  const clerkId = isDev && testBypass ? "test_user_id" : (await auth()).userId;
  if (!clerkId) return null;

  return prisma.user.upsert({
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
}

/** POST /api/learning/outcome — learner result after Atlas-chosen lesson. */
export async function POST(req: Request) {
  try {
    const user = await resolveUser(req);
    if (!user || !user.clerkId) {
      return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
    }
    const clerkId = user.clerkId;

    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
    }
    const rl = await rateLimit("learning-outcome", clerkId, 30, 60);
    if (!rl.success) {
      return NextResponse.json({ error: Errors.rateLimited }, { status: 429 });
    }
    if (!(await hasValidConsent(clerkId))) {
      return NextResponse.json({ error: Errors.consentRequired }, { status: 403 });
    }

    const parsed = outcomeBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: Errors.badRequest, details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    if (body.learnerId && body.learnerId !== user.id) {
      return NextResponse.json({ error: Errors.forbidden }, { status: 403 });
    }
    const learnerId = user.id;

    const result = await atlasOutcome({
      userId: user.id,
      learnerId,
      idempotencyKey: body.idempotencyKey,
      correct: body.correct,
      completed: body.completed,
      responseTimeSec: body.responseTimeSec,
      selfReportedConfidence: body.selfReportedConfidence,
    });

    return NextResponse.json({
      receipt: result.receipt,
      masteryBefore: result.masteryBefore,
      masteryAfter: result.masteryAfter,
    });
  } catch (err) {
    if (err instanceof AtlasAdapterError) {
      const status = err.code === "SESSION_NOT_FOUND" ? 404 : 502;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[learning/outcome]", err);
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
