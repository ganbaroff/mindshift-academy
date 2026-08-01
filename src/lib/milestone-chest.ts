/**
 * Deterministic milestone chest — replaces gacha randomness entirely.
 * Fixed, pre-announced rewards. Inventory grandfathered (never deleted).
 * @see docs/product/MINDSHIFT-ENGAGEMENT-AND-CERTIFICATE.md §2
 */

/** Crystals awarded once per completed session by the session's effective tier. */
export const SESSION_TIER_CRYSTALS: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 15,
  3: 20,
};

export type WeeklyCosmetic = {
  week: 1 | 2 | 3 | 4 | 5;
  itemId: string;
  itemType: "skin" | "badge";
  nameRu: string;
};

/** Named weekly cosmetics — visible on the journey map before the week starts. */
export const WEEKLY_COSMETICS: readonly WeeklyCosmetic[] = [
  { week: 1, itemId: "badge_listener", itemType: "badge", nameRu: "Значок Слушателя" },
  { week: 2, itemId: "badge_builder", itemType: "badge", nameRu: "Значок Строителя" },
  { week: 3, itemId: "badge_tracker", itemType: "badge", nameRu: "Значок Следопыта" },
  { week: 4, itemId: "skin_pattern_cloak", itemType: "skin", nameRu: "Плащ узоров" },
  { week: 5, itemId: "skin_thinker_aura", itemType: "skin", nameRu: "Аура мыслителя" },
] as const;

export function crystalsForSessionTier(tier: 1 | 2 | 3): number {
  return SESSION_TIER_CRYSTALS[tier];
}

export function weeklyCosmeticFor(week: 1 | 2 | 3 | 4 | 5): WeeklyCosmetic {
  const row = WEEKLY_COSMETICS.find((c) => c.week === week);
  if (!row) throw new Error(`No weekly cosmetic for week ${week}`);
  return row;
}

/** Session-complete crystal event id — idempotent, never random. */
export function sessionChestEventId(sessionId: string): string {
  return `milestone:session:${sessionId}`;
}

/** Weekly cosmetic claim event id — idempotent. */
export function weeklyChestEventId(week: 1 | 2 | 3 | 4 | 5): string {
  return `milestone:week:${week}`;
}

/**
 * Proof helper: reward path never consults chance tables.
 * Returns the exact crystal amount for a known tier.
 */
export function announceSessionReward(tier: 1 | 2 | 3): {
  crystals: number;
  source: "milestone-chest";
} {
  return { crystals: crystalsForSessionTier(tier), source: "milestone-chest" };
}

export function announceWeeklyReward(week: 1 | 2 | 3 | 4 | 5): WeeklyCosmetic {
  return weeklyCosmeticFor(week);
}
