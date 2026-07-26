/**
 * Persist deterministic attempt outcomes. Never stores child utterance text.
 */

import { prisma } from "@/lib/prisma";
import { masteryAfterTask } from "./mastery";
import { spacingAfterOutcome } from "./spacing";

export type PersistAttemptInput = {
  userId: string;
  concept: string;
  family: string;
  tier: 1 | 2 | 3;
  pass: boolean;
  eventId?: string;
};

export type PersistAttemptResult = {
  recorded: boolean;
  mastery: number;
  intervalStep: number;
  nextReviewAt: Date | null;
};

export async function persistTaskAttempt(
  input: PersistAttemptInput
): Promise<PersistAttemptResult> {
  if (input.eventId) {
    try {
      await prisma.taskAttempt.create({
        data: {
          userId: input.userId,
          concept: input.concept,
          family: input.family,
          tier: input.tier,
          pass: input.pass,
          eventId: input.eventId,
        },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") {
        const existing = await prisma.conceptMastery.findUnique({
          where: { userId_concept: { userId: input.userId, concept: input.concept } },
        });
        return {
          recorded: false,
          mastery: existing?.mastery ?? 0,
          intervalStep: existing?.intervalStep ?? 0,
          nextReviewAt: existing?.nextReviewAt ?? null,
        };
      }
      throw e;
    }
  } else {
    await prisma.taskAttempt.create({
      data: {
        userId: input.userId,
        concept: input.concept,
        family: input.family,
        tier: input.tier,
        pass: input.pass,
      },
    });
  }

  const prior = await prisma.conceptMastery.findUnique({
    where: { userId_concept: { userId: input.userId, concept: input.concept } },
  });
  const mastery = masteryAfterTask(prior?.mastery ?? 0, input.pass, input.tier);
  const spacing = spacingAfterOutcome(prior?.intervalStep ?? 0, input.pass);

  const row = await prisma.conceptMastery.upsert({
    where: { userId_concept: { userId: input.userId, concept: input.concept } },
    create: {
      userId: input.userId,
      concept: input.concept,
      mastery,
      intervalStep: spacing.intervalStep,
      nextReviewAt: spacing.nextReviewAt,
    },
    update: {
      mastery,
      intervalStep: spacing.intervalStep,
      nextReviewAt: spacing.nextReviewAt,
    },
  });

  return {
    recorded: true,
    mastery: row.mastery,
    intervalStep: row.intervalStep,
    nextReviewAt: row.nextReviewAt,
  };
}
