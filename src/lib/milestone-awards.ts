/**
 * Award session-complete crystals (tier table) + weekly cosmetics.
 * Idempotent via RewardEvent. Grandfathers existing Inventory.
 */

import { prisma } from "@/lib/prisma";
import {
  crystalsForSessionTier,
  sessionChestEventId,
  weeklyChestEventId,
  weeklyCosmeticFor,
} from "@/lib/milestone-chest";
import { WEEK_SESSIONS } from "@/lib/evolution";

function isUniqueConflict(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  if (e?.code === "P2002") return true;
  const msg = e?.message ?? "";
  return /UNIQUE constraint failed/i.test(msg) || /SQLITE_CONSTRAINT/i.test(msg);
}

export async function awardSessionMilestoneCrystals(params: {
  userId: string;
  sessionId: string;
  tier: 1 | 2 | 3;
}): Promise<{ awarded: boolean; crystals: number; amount: number }> {
  const amount = crystalsForSessionTier(params.tier);
  const eventId = sessionChestEventId(params.sessionId);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.rewardEvent.findUnique({ where: { eventId } });
    if (existing) {
      const cur = await tx.user.findUnique({
        where: { id: params.userId },
        select: { crystals: true },
      });
      return { awarded: false, crystals: cur?.crystals ?? 0, amount };
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
        return { awarded: false, crystals: cur?.crystals ?? 0, amount };
      }
      throw e;
    }
    const updated = await tx.user.update({
      where: { id: params.userId },
      data: { crystals: { increment: amount } },
      select: { crystals: true },
    });
    return { awarded: true, crystals: updated.crystals, amount };
  });
}

export async function awardWeeklyCosmeticIfReady(params: {
  userId: string;
  week: 1 | 2 | 3 | 4 | 5;
  completedSessionIds: ReadonlySet<string> | readonly string[];
}): Promise<{ awarded: boolean; itemId: string | null }> {
  const completed =
    params.completedSessionIds instanceof Set
      ? params.completedSessionIds
      : new Set(params.completedSessionIds);
  const ready = WEEK_SESSIONS[params.week].every((id) => completed.has(id));
  if (!ready) return { awarded: false, itemId: null };

  const cosmetic = weeklyCosmeticFor(params.week);
  const eventId = weeklyChestEventId(params.week);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.rewardEvent.findUnique({ where: { eventId } });
    if (existing) return { awarded: false, itemId: cosmetic.itemId };

    try {
      await tx.rewardEvent.create({
        data: { eventId, userId: params.userId, stepId: params.week },
      });
    } catch (e) {
      if (isUniqueConflict(e)) return { awarded: false, itemId: cosmetic.itemId };
      throw e;
    }

    // Upsert inventory — never deletes prior items (grandfather).
    await tx.inventory.upsert({
      where: {
        userId_itemId: { userId: params.userId, itemId: cosmetic.itemId },
      },
      update: {},
      create: {
        userId: params.userId,
        itemType: cosmetic.itemType,
        itemId: cosmetic.itemId,
      },
    });

    return { awarded: true, itemId: cosmetic.itemId };
  });
}
