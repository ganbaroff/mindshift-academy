/**
 * Per-concept mastery for the thinking curriculum.
 * Moves only on deterministic checker outcomes (never on LLM judge).
 */

import { clampMastery } from "@/lib/atlas-learning/mastery";

/** Tier weight: harder pass moves mastery more; fail on hard still hurts, but less than easy fail. */
const PASS_DELTA: Record<1 | 2 | 3, number> = { 1: 0.08, 2: 0.12, 3: 0.18 };
const FAIL_DELTA: Record<1 | 2 | 3, number> = { 1: -0.06, 2: -0.04, 3: -0.03 };

export function masteryAfterTask(
  current: number,
  pass: boolean,
  tier: 1 | 2 | 3
): number {
  const delta = pass ? PASS_DELTA[tier] : FAIL_DELTA[tier];
  return clampMastery(current + delta);
}

/**
 * Offer tier from mastery. Boundaries are provisional until Phase 4 calibration;
 * they intentionally stay simple so content can ship.
 */
export function tierForMastery(mastery: number): 1 | 2 | 3 {
  if (mastery < 0.35) return 1;
  if (mastery < 0.7) return 2;
  return 3;
}
