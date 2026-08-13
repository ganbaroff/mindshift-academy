/**
 * What tier 3 additionally demands of a passing program.
 *
 * Until 2026-08-13 the tier changed one hint line and nothing else: a child at tier 3 was
 * handed the same task as a child at tier 1, so there was no ceiling, only a withdrawn
 * reminder (docs/CURRICULUM-STATUS-2026-08-11.md, «Возраст» §3-4).
 *
 * This module is the server half of the fix. It never turns a fail into a pass — it can only
 * refuse a pass that the family checker already granted, and only at tier 3. Deterministic,
 * no LLM, closed Russian copy, exactly like every other progression gate here.
 *
 * Scope, stated plainly rather than implied: only `sequence-world` carries a tier-3 demand
 * today.
 *   - `grid-draw` and `claim-check` already require an exact answer, so there is no slack
 *     left to tighten.
 *   - `pattern-expand` already asks for a rule rather than a list.
 *   - `rule-runner` HAS the same slack (a child can enumerate one rule per map instead of
 *     generalising with «иначе»), but the minimal-rule-count check needs `checkRuleRunner`'s
 *     internals, so it is deliberately not shipped here rather than guessed at. A wrong
 *     deterministic gate is worse than a missing one.
 */

import { sequenceWorld } from "./sequence-world";
import type { AttemptOutcome } from "./attempt";
import type { SequenceProgram, TaskFamilyId } from "./types";

/**
 * The economy demand, in the monster's voice. Fixed strings, never model output —
 * the child must be able to see what was wrong without a second attempt to guess it.
 */
export const TIER_THREE_FEEDBACK = {
  duplicate: "План сработал, но один шаг ты повторил. На третьем уровне я выполняю каждый шаг один раз — скажи короче.",
  tooLong: "План сработал, но в нём есть лишние шаги. На третьем уровне скажи только то, без чего не обойтись.",
} as const;

export type TierThreeViolation = keyof typeof TIER_THREE_FEEDBACK;

/**
 * Does this passing plan meet the tier-3 economy demand?
 *
 * Both checks bite on real slack in the engine, verified against the three shipped worlds:
 * `checkSequence` passes on `failure === null && goal > 0` with no bound on step count, and
 * every world's terminal action (plus `положить_сыр` in the sandwich) has no self-cap, so a
 * repeated step passes today. That is what tier 3 stops allowing.
 */
export function checkSequenceEconomy(
  steps: string[],
  worldId?: string | null
): { ok: true } | { ok: false; violation: TierThreeViolation } {
  if (new Set(steps).size !== steps.length) {
    return { ok: false, violation: "duplicate" };
  }
  const declared = sequenceWorld(worldId).actions.length;
  if (steps.length > declared) {
    return { ok: false, violation: "tooLong" };
  }
  return { ok: true };
}

/**
 * Apply the tier-3 demand to an outcome the family checker has already resolved.
 * A no-op unless: tier is 3, the program parsed, the family carries a demand, and the
 * outcome was a pass. Returns the same object when nothing changes, so the caller can
 * stay oblivious.
 */
export function applyTierThreeDemand(args: {
  tier: 1 | 2 | 3;
  family: TaskFamilyId | string;
  outcome: AttemptOutcome;
  program?: { status: string; steps?: unknown } | null;
  worldId?: string | null;
}): AttemptOutcome {
  const { tier, family, outcome, program, worldId } = args;
  if (tier !== 3) return outcome;
  if (family !== "sequence-world") return outcome;
  if (!outcome.pass || outcome.programStatus !== "ok") return outcome;
  if (!program || program.status !== "ok") return outcome;

  const steps = (program as SequenceProgram & { status: "ok" }).steps;
  if (!Array.isArray(steps)) return outcome;

  const verdict = checkSequenceEconomy(steps, worldId);
  if (verdict.ok) return outcome;

  return {
    ...outcome,
    pass: false,
    feedback: TIER_THREE_FEEDBACK[verdict.violation],
    reasonCode: `TIER3_${verdict.violation.toUpperCase()}`,
  };
}
