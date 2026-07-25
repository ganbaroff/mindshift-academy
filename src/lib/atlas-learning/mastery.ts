/**
 * VOLAURA-side mastery updates — Atlas never writes mastery.
 * Pure functions for deterministic tests.
 */

export function clampMastery(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000));
}

/** Transparent mastery delta after one lesson outcome. */
export function masteryAfterOutcome(current: number, correct: boolean): number {
  const delta = correct ? 0.15 : -0.05;
  return clampMastery(current + delta);
}
