/**
 * Competency-tied companion evolution — derived purely from mastery milestones.
 * Never from login, time spent, or streak. Irreversible once earned.
 * @see docs/product/MINDSHIFT-ENGAGEMENT-AND-CERTIFICATE.md §1
 */

export const CONCEPT_MASTERY_THRESHOLD = 0.35;

export const EVOLUTION_STAGE_NAMES = [
  "novice",
  "listener",
  "builder",
  "tracker",
  "pattern-master",
  "thinker",
] as const;

export type EvolutionStageId = (typeof EVOLUTION_STAGE_NAMES)[number];

/** Week → concept that must reach threshold for that week's evolution. */
export const WEEK_CONCEPT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "precision",
  2: "decomposition",
  3: "conditions",
  4: "pattern",
  5: "verification",
};

export const WEEK_SESSIONS: Record<1 | 2 | 3 | 4 | 5, readonly string[]> = {
  1: ["w1-s1", "w1-s2", "w1-s3"],
  2: ["w2-s1", "w2-s2", "w2-s3"],
  3: ["w3-s1", "w3-s2", "w3-s3"],
  4: ["w4-s1", "w4-s2", "w4-s3"],
  5: ["w5-s1", "w5-s2", "w5-s3"],
};

export const CAPSTONE_SESSION_ID = "w5-s3";

export type EvolutionInput = {
  /** concept → mastery score [0,1] */
  masteryByConcept: Record<string, number>;
  /** session ids completed via deterministic gates */
  completedSessionIds: ReadonlySet<string> | readonly string[];
  /** Capstone (session 15) completed — unlocks graduation aura on stage 5 */
  capstoneComplete?: boolean;
};

export type EvolutionState = {
  /** Highest earned stage 0..5 */
  stage: 0 | 1 | 2 | 3 | 4 | 5;
  stageId: EvolutionStageId;
  /** Solemn aura on thinker — only after capstone, not a 7th form */
  graduationAura: boolean;
};

function asSet(ids: EvolutionInput["completedSessionIds"]): Set<string> {
  return ids instanceof Set ? ids : new Set(ids);
}

function weekComplete(week: 1 | 2 | 3 | 4 | 5, completed: Set<string>): boolean {
  return WEEK_SESSIONS[week].every((id) => completed.has(id));
}

function conceptAtThreshold(
  masteryByConcept: Record<string, number>,
  concept: string,
  threshold = CONCEPT_MASTERY_THRESHOLD
): boolean {
  return (masteryByConcept[concept] ?? 0) >= threshold;
}

/**
 * Pure derivation: stage N requires weeks 1..N complete AND each week's concept
 * at threshold. Capstone adds graduationAura on stage 5 only.
 */
export function deriveEvolution(input: EvolutionInput): EvolutionState {
  const completed = asSet(input.completedSessionIds);
  let stage: 0 | 1 | 2 | 3 | 4 | 5 = 0;

  for (const week of [1, 2, 3, 4, 5] as const) {
    const concept = WEEK_CONCEPT[week];
    if (
      weekComplete(week, completed) &&
      conceptAtThreshold(input.masteryByConcept, concept)
    ) {
      stage = week as 0 | 1 | 2 | 3 | 4 | 5;
    } else {
      break;
    }
  }

  const graduationAura =
    stage === 5 &&
    Boolean(input.capstoneComplete ?? completed.has(CAPSTONE_SESSION_ID));

  return {
    stage,
    stageId: EVOLUTION_STAGE_NAMES[stage],
    graduationAura,
  };
}
