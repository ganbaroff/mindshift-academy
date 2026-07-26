/**
 * Session completion is deterministic: practice + transfer checks at required tier.
 * LLM formulation never gates progress.
 */

export type SessionTaskResult = {
  id: string;
  role: "practice" | "transfer" | "collision" | "other";
  pass: boolean;
  tier: number;
};

export type SessionDef = {
  id: string;
  concept: string;
  /** Minimum practice passes required (after collision). */
  practiceRequired: number;
  /** Transfer must pass. */
  requireTransfer: boolean;
  /** Minimum tier that counts for completion. */
  minTier: 1 | 2 | 3;
};

export function sessionComplete(def: SessionDef, results: SessionTaskResult[]): boolean {
  const practicePasses = results.filter(
    (r) => r.role === "practice" && r.pass && r.tier >= def.minTier
  ).length;
  if (practicePasses < def.practiceRequired) return false;
  if (!def.requireTransfer) return true;
  return results.some((r) => r.role === "transfer" && r.pass && r.tier >= def.minTier);
}
