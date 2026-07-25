import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  atlasDecide,
  AtlasAdapterError,
} from "@/lib/atlas-learning/adapter.server";
import { energyLevelSchema } from "@/lib/atlas-learning/contracts";

const decideBodySchema = z.object({
  concept: z.string().min(1).default("sigmoid"),
  learnerId: z.string().min(1).optional(),
  mastery: z.number().min(0).max(1).optional(),
  lastAnswers: z.array(z.boolean()).min(1).optional(),
  responseTimeSec: z.number().min(0).optional(),
  energy: energyLevelSchema.optional(),
  idempotencyKey: z.string().min(1).optional(),
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

/** POST /api/learning/decide — Atlas NBA decide + mapped Sigmoid lesson. */
export async function POST(req: Request) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = decideBodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const learnerId = body.learnerId ?? user.id;

    const result = await atlasDecide({
      userId: user.id,
      learnerId,
      idempotencyKey: body.idempotencyKey,
      input: {
        learnerId,
        concept: body.concept,
        mastery: body.mastery,
        lastAnswers: body.lastAnswers,
        responseTimeSec: body.responseTimeSec,
        energy: body.energy,
      },
    });

    return NextResponse.json({
      receipt: result.receipt,
      lesson: {
        format: result.lessonFormat,
        html: result.lessonHtml,
      },
      sessionId: result.sessionId,
      mastery: result.mastery,
      stored: {
        decisionId: result.receipt.decisionId,
        goalId: result.receipt.goalId,
        decisionScore: result.receipt.decision?.decisionScore,
        action: result.receipt.decision?.action,
      },
    });
  } catch (err) {
    if (err instanceof AtlasAdapterError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 502 });
    }
    console.error("[learning/decide]", err);
    return NextResponse.json({ error: "Decide failed" }, { status: 500 });
  }
}
