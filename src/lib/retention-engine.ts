// Retention Engine — mood floor + frozen streak fields.
// Gacha randomness REMOVED (canon §6 / engagement §2). Milestone chest replaces it.
// export function rollGacha — REMOVED; do not restore.

export const STREAK_MATH = {
  MOOD_DROP_PER_MISSED_DAY: 25,
  MOOD_RECOVERY_PER_LESSON: 30,
  STREAK_FREEZE_COST: 500,
  MAX_MOOD: 100,
  WARNING_THRESHOLD: 40,
};

/** @deprecated Daily-login gacha pools — kept as empty frozen constants for grandfather docs only. */
export const GACHA_PROBABILITIES = {
  DAILY_DROP: [] as const,
  DAY_7_GUARANTEE: [] as const,
  SHARDS_NEEDED_FOR_SKIN: 5,
};

export const DAILY_QUESTS = [
  { id: "q1", promptTarget: "IF/ELSE", title: "Научи меня условиям", reward: 20 },
  { id: "q2", promptTarget: "LOOP", title: "Заставь меня повторить", reward: 20 },
  { id: "q3", promptTarget: "ENCRYPT", title: "Зашифруй слово 'Яблоко'", reward: 30 },
  { id: "q4", promptTarget: "VISION", title: "Покажи мне кота", reward: 40 },
];

export function applyMoodDecay(currentMood: number, missedDays: number): number {
  const decayed = currentMood - STREAK_MATH.MOOD_DROP_PER_MISSED_DAY * missedDays;
  // Floor 55: absence must never turn the pet sad (<50 = sad face) — no neglect punishment.
  return Math.max(55, decayed);
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
  return Math.max(0, diffDays - 1);
}

export function getActiveDailyQuest(): (typeof DAILY_QUESTS)[number] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return DAILY_QUESTS[dayOfYear % DAILY_QUESTS.length];
}
