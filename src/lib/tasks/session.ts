/**
 * Session completion is deterministic: practice + transfer checks at required tier.
 * LLM formulation never gates progress.
 */

export type SessionTaskResult = {
  id: string;
  role: "practice" | "transfer" | "collision" | "prediction" | "other";
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
  /** Collision evidence must pass (used by capstone). */
  requireCollision?: boolean;
  /** A separate prediction task must pass (used by capstone). */
  requirePrediction?: boolean;
  /** Minimum tier that counts for completion. */
  minTier: 1 | 2 | 3;
};

export function sessionComplete(def: SessionDef, results: SessionTaskResult[]): boolean {
  const practicePasses = results.filter(
    (r) => r.role === "practice" && r.pass && r.tier >= def.minTier
  ).length;
  if (practicePasses < def.practiceRequired) return false;
  const hasRequiredPass = (role: SessionTaskResult["role"]) =>
    results.some((r) => r.role === role && r.pass && r.tier >= def.minTier);
  if (def.requireCollision && !hasRequiredPass("collision")) return false;
  if (def.requirePrediction && !hasRequiredPass("prediction")) return false;
  if (def.requireTransfer && !hasRequiredPass("transfer")) return false;
  return true;
}
