/**
 * Crystal economy for thinking curriculum: earn on task pass, spend on scaffold hints.
 * Never stores child utterances. Idempotent via RewardEvent eventId.
 */

import { prisma } from "@/lib/prisma";
import {
  HINT_CRYSTAL_COST,
  TASK_PASS_CRYSTAL_REWARD,
  STARTER_CRYSTALS,
} from "@/content/curriculum/types";

export { HINT_CRYSTAL_COST, TASK_PASS_CRYSTAL_REWARD, STARTER_CRYSTALS };

export function hintEventId(sessionId: string, taskId: string): string {
  return `hint:${sessionId}:${taskId}`;
}

export function taskPassEventId(sessionId: string, taskId: string): string {
  return `taskpass:${sessionId}:${taskId}`;
}

function isUniqueConflict(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === "P2002") return true;
  const msg = e?.message ?? "";
  return /UNIQUE constraint failed/i.test(msg) || /SQLITE_CONSTRAINT/i.test(msg);
}

const STARTER_EVENT = "crystal-starter:v1";

/** One-time starter crystals. Idempotent via RewardEvent. Transactional. */
export async function ensureStarterCrystals(userId: string): Promise<number> {
  const eventId = `${STARTER_EVENT}:${userId}`;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.rewardEvent.findUnique({ where: { eventId } });
    if (existing) {
      const cur = await tx.user.findUnique({
        where: { id: userId },
        select: { crystals: true },
      });
      return cur?.crystals ?? 0;
    }
    try {
      await tx.rewardEvent.create({
        data: { eventId, userId, stepId: 0 },
      });
    } catch (e) {
      if (isUniqueConflict(e)) {
        const cur = await tx.user.findUnique({
          where: { id: userId },
          select: { crystals: true },
        });
        return cur?.crystals ?? 0;
      }
      throw e;
    }
    const updated = await tx.user.update({
      where: { id: userId },
      data: { crystals: { increment: STARTER_CRYSTALS } },
      select: { crystals: true },
    });
    return updated.crystals;
  });
}

/**
 * Spend crystals for a scaffold hint. Idempotent: same eventId returns alreadyOwned.
 * Never returns the hint text — caller loads that from content after success.
 */
export async function spendCrystalsForHint(params: {
  userId: string;
  sessionId: string;
  taskId: string;
  cost?: number;
}): Promise<
  | { ok: true; alreadyOwned: boolean; crystals: number }
  | { ok: false; reason: "insufficient"; crystals: number }
> {
  const cost = params.cost ?? HINT_CRYSTAL_COST;
  const eventId = hintEventId(params.sessionId, params.taskId);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.rewardEvent.findUnique({ where: { eventId } });
    if (existing) {
      const cur = await tx.user.findUnique({
        where: { id: params.userId },
        select: { crystals: true },
      });
      return { ok: true as const, alreadyOwned: true, crystals: cur?.crystals ?? 0 };
    }

    const user = await tx.user.findUnique({
      where: { id: params.userId },
      select: { crystals: true },
    });
    const balance = user?.crystals ?? 0;
    if (balance < cost) {
      return { ok: false as const, reason: "insufficient" as const, crystals: balance };
    }

    await tx.rewardEvent.create({
      data: { eventId, userId: params.userId, stepId: 0 },
    });
    const updated = await tx.user.update({
      where: { id: params.userId },
      data: { crystals: { decrement: cost } },
      select: { crystals: true },
    });
    return { ok: true as const, alreadyOwned: false, crystals: updated.crystals };
  });
}

/** Award crystals on first successful task pass. Replay awards nothing. Transactional. */
export async function awardTaskPassCrystals(params: {
  userId: string;
  sessionId: string;
  taskId: string;
  amount?: number;
}): Promise<{ awarded: boolean; crystals: number }> {
  const amount = params.amount ?? TASK_PASS_CRYSTAL_REWARD;
  const eventId = taskPassEventId(params.sessionId, params.taskId);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.rewardEvent.findUnique({ where: { eventId } });
    if (existing) {
      const cur = await tx.user.findUnique({
        where: { id: params.userId },
        select: { crystals: true },
      });
      return { awarded: false, crystals: cur?.crystals ?? 0 };
    }
    try {
      await tx.rewardEvent.create({
        data: { eventId, userId: params.userId, stepId: 0 },
      });
    } catch (e) {
      if (isUniqueConflict(e)) {
        const cur = await tx.user.findUnique({
          where: { id: params.userId },
          select: { crystals: true },
        });
        return { awarded: false, crystals: cur?.crystals ?? 0 };
      }
      throw e;
    }
    const updated = await tx.user.update({
      where: { id: params.userId },
      data: { crystals: { increment: amount } },
      select: { crystals: true },
    });
    return { awarded: true, crystals: updated.crystals };
  });
}

export async function hasHintUnlocked(
  userId: string,
  sessionId: string,
  taskId: string
): Promise<boolean> {
  const row = await prisma.rewardEvent.findUnique({
    where: { eventId: hintEventId(sessionId, taskId) },
  });
  return Boolean(row);
}

/** Task ids already passed for a session — prefer TaskAttempt (contract), fall back to RewardEvent. */
export async function listPassedTaskIds(userId: string, sessionId: string): Promise<string[]> {
  const { getSession } = await import("@/content/curriculum");
  const { deriveResumeFromAttempts } = await import("./resume");
  const session = getSession(sessionId);

  const attemptRows = await prisma.taskAttempt.findMany({
    where: { userId, sessionId, pass: true },
    select: { taskId: true, tier: true, pass: true },
  });
  const withTaskId = attemptRows.filter(
    (r): r is { taskId: string; tier: number; pass: boolean } => Boolean(r.taskId)
  );

  if (session && withTaskId.length > 0) {
    return deriveResumeFromAttempts(
      session.tasks,
      withTaskId.map((r) => ({ taskId: r.taskId, pass: r.pass, tier: r.tier })),
      session.minTier
    ).passedTaskIds;
  }

  // Legacy fallback: crystal award ledger (pre-W2 rows without sessionId/taskId).
  const prefix = `taskpass:${sessionId}:`;
  const rows = await prisma.rewardEvent.findMany({
    where: { userId, eventId: { startsWith: prefix } },
    select: { eventId: true },
  });
  return rows.map((r) => r.eventId.slice(prefix.length)).filter(Boolean);
}

/** Whether a curriculum session meets sessionComplete from recorded pass awards. */
export async function isCurriculumSessionComplete(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const { getSession } = await import("@/content/curriculum");
  const { sessionComplete } = await import("@/lib/tasks/session");
  const session = getSession(sessionId);
  if (!session) return false;
  const passed = await listPassedTaskIds(userId, sessionId);
  const passedSet = new Set(passed);
  const results = session.tasks
    .filter((t) => passedSet.has(t.id))
    .map((t) => ({
      id: t.id,
      role: t.role === "collision" ? ("collision" as const) : t.role,
      pass: true,
      tier: t.tier,
    }));
  return sessionComplete(
    {
      id: session.id,
      concept: session.concept,
      practiceRequired: session.practiceRequired,
      requireTransfer: true,
      minTier: session.minTier,
    },
    results
  );
}
