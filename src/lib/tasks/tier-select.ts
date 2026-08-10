/**
 * Runtime tier offered from ConceptMastery (spec §8).
 * Authored task.tier is a content hint; live difficulty follows mastery.
 */

import { tierForMastery } from "./mastery";

/** Clamp authored tier to the mastery-selected offer (never raise above authored for collision). */
export function selectOfferedTier(mastery: number): 1 | 2 | 3 {
  return tierForMastery(mastery);
}

/**
 * Effective tier recorded for an attempt:
 * - collision stays at authored (story beat)
 * - practice/transfer use max(authored, offered) so advanced learners still get credit at their level
 *   while never going below the authored floor for that card
 */
export function effectiveTaskTier(
  authoredTier: 1 | 2 | 3,
  offeredTier: 1 | 2 | 3,
  role: "collision" | "practice" | "prediction" | "transfer"
): 1 | 2 | 3 {
  if (role === "collision") return authoredTier;
  return Math.max(authoredTier, offeredTier) as 1 | 2 | 3;
}
