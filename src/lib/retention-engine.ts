// Retention Engine — Gacha, Streak, and Mood mechanics

export const STREAK_MATH = {
  MOOD_DROP_PER_MISSED_DAY: 25,
  MOOD_RECOVERY_PER_LESSON: 30,
  STREAK_FREEZE_COST: 500,
  MAX_MOOD: 100,
  WARNING_THRESHOLD: 40,
};

export const GACHA_PROBABILITIES = {
  DAILY_DROP: [
    { type: "crystals" as const, amount: 10, chance: 0.50 },
    { type: "crystals" as const, amount: 50, chance: 0.30 },
    { type: "skin_shard" as const, itemId: "cyber_visor", chance: 0.15 },
    { type: "crystals" as const, amount: 200, chance: 0.05 },
  ],
  DAY_7_GUARANTEE: [
    { type: "skin" as const, itemId: "neon_wings", chance: 0.70 },
    { type: "skin" as const, itemId: "golden_crown", chance: 0.30 },
  ],
  SHARDS_NEEDED_FOR_SKIN: 5,
};

export const DAILY_QUESTS = [
  { id: "q1", promptTarget: "IF/ELSE", title: "Научи меня условиям", reward: 20 },
  { id: "q2", promptTarget: "LOOP", title: "Заставь меня повторить", reward: 20 },
  { id: "q3", promptTarget: "ENCRYPT", title: "Зашифруй слово 'Яблоко'", reward: 30 },
  { id: "q4", promptTarget: "VISION", title: "Покажи мне кота", reward: 40 },
];

// --- Logic functions ---

export function applyMoodDecay(currentMood: number, missedDays: number): number {
  const decayed = currentMood - STREAK_MATH.MOOD_DROP_PER_MISSED_DAY * missedDays;
  return Math.max(0, decayed);
}

export function recoverMood(currentMood: number): number {
  return Math.min(
    STREAK_MATH.MAX_MOOD,
    currentMood + STREAK_MATH.MOOD_RECOVERY_PER_LESSON
  );
}

export function shouldWarnParent(mood: number): boolean {
  return mood <= STREAK_MATH.WARNING_THRESHOLD && mood > 0;
}

export function getMissedDays(lastActive: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays - 1); // same-day and next-day = 0 missed
}

type GachaDrop =
  | { type: "crystals"; amount: number }
  | { type: "skin_shard"; itemId: string }
  | { type: "skin"; itemId: string };

export function rollGacha(streakDay: number): GachaDrop {
  const isDay7 = streakDay > 0 && streakDay % 7 === 0;
  const pool = isDay7
    ? GACHA_PROBABILITIES.DAY_7_GUARANTEE
    : GACHA_PROBABILITIES.DAILY_DROP;

  const roll = Math.random();
  let cumulative = 0;

  for (const item of pool) {
    cumulative += item.chance;
    if (roll <= cumulative) {
      if (item.type === "crystals") {
        return { type: "crystals", amount: (item as { amount: number }).amount };
      }
      if (item.type === "skin_shard" || item.type === "skin") {
        return { type: item.type, itemId: (item as { itemId: string }).itemId };
      }
    }
  }

  // Fallback to first item (should never reach here)
  const fallback = pool[0];
  if (fallback.type === "crystals") {
    return { type: "crystals", amount: (fallback as { amount: number }).amount };
  }
  return { type: fallback.type as "skin", itemId: (fallback as { itemId: string }).itemId };
}

export function getActiveDailyQuest(): (typeof DAILY_QUESTS)[number] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return DAILY_QUESTS[dayOfYear % DAILY_QUESTS.length];
}
