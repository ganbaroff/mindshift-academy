import type { TaskFamilyId } from "@/lib/tasks/types";
import { normalizeRuleMap, type RuleMap } from "@/lib/tasks/rule-runner";
import type { Claim } from "@/lib/tasks/claim-check";

/** Crystal cost to reveal one task's scaffold hint. */
export const HINT_CRYSTAL_COST = 5;

/** Crystals earned on first pass of a thinking-curriculum task. */
export const TASK_PASS_CRYSTAL_REWARD = 3;

/** One-time starter balance so a child can buy early scaffolds. */
export const STARTER_CRYSTALS = 15;

export type ContentTask = {
  id: string;
  role: "collision" | "practice" | "prediction" | "transfer";
  family: TaskFamilyId;
  /** Authoring hint; runtime may raise/lower via mastery. */
  tier: 1 | 2 | 3;
  /**
   * Free challenge shown to the child. Must NOT name the answer figure
   * (target grid is the goal). Never a transcription exercise.
   */
  promptRu: string;
  /**
   * Paid scaffold — how to structure speech, not which cells to fill.
   * Revealed via /api/hints/reveal for HINT_CRYSTAL_COST crystals.
   */
  hintRu: string;
  /**
   * ── The brief: three things a task must state before the child acts ──
   * Contract: docs/architecture/08-UX-MONSTER-JOURNEY.md §2, rendered per §10.2.
   * Optional in the type until every week is backfilled; `validateSession` makes
   * them required per week as soon as one task in that week has them, so nothing
   * breaks mid-migration and no week ships half-briefed.
   */
  /** Цель — one sentence naming the finished thing. Replaces promptRu on screen. */
  goalRu?: string;
  /** Что дано — the explicit list the child works with. Never «и т.д.». Shown in the workspace. */
  givenRu?: string[];
  /**
   * Готово, когда — one short line in the monster's voice, always visible before the
   * first attempt (§10.2: we refused to hide the success condition until after a miss).
   * No label, no third row: «получится, когда назовёшь 4 шага по порядку».
   */
  doneWhenRu?: string;
  /** The same condition with its reasoning, revealed as an expansion after a miss. */
  doneWhenFullRu?: string;
  /**
   * sequence-world: which micro-world this task runs in. Required by `validateSession`
   * for that family — the engine used to hardcode one sandwich, which is how a whole week
   * came to teach the same six steps three sessions running.
   */
  worldId?: string;
  /**
   * The situation this task happens in, for the four families where the world lives in the
   * prose and no engine reads it (`grid-draw`, `rule-runner`, `pattern-expand`, `claim-check`).
   * Purely declarative: nothing resolves it, so it can never select a state machine the way
   * `worldId` does. It exists so «which world is this?» is a fact a test can check rather than
   * a guess from Russian text — see `tests/curriculum-variety.test.mjs`, which demands that a
   * week is not one world and that its transfer task leaves the world it practised.
   */
  world?: string;
  /** grid-draw: 0-based target cells. */
  target?: [number, number][];
  /** rule-runner: maps the child's rule must pass. */
  ruleMaps?: RuleMap[];
  /** pattern-expand: expected terms after expansion. */
  patternExpected?: string[];
  /** pattern-expand: how many terms to generate (defaults to expected.length). */
  patternExpandCount?: number;
  /** claim-check: claims with ground-truth labels. */
  claims?: Claim[];
};

export type SessionContent = {
  id: string;
  week: number;
  session: number;
  concept: string;
  misconception: string;
  titleRu: string;
  explanationRu: string;
  dinnerQuestionRu: string;
  tasks: ContentTask[];
  practiceRequired: number;
  minTier: 1 | 2 | 3;
  /** Require a passed collision task before session completion. */
  requireCollision?: boolean;
  /** Require a distinct passed prediction task before session completion. */
  requirePrediction?: boolean;
};

/** Public claim — ground-truth stripped (never send answer key to client). */
export type PublicClaim = Omit<Claim, "truth">;
/**
 * What a map may tell the browser: the situation, never the answer.
 *
 * `expect` — the set of actions that count as right — is the answer key and stays on the
 * server, exactly like a sequence world's requirements. `ahead` is kept alongside `signals`
 * because the current surface is a corridor and reads it directly.
 */
export type PublicRuleMap = {
  id: string;
  signals: Record<string, string>;
  ahead?: string;
};

/** Public session payload — hints stripped until purchased. */
export type PublicContentTask = Omit<
  ContentTask,
  "hintRu" | "claims" | "patternExpected" | "ruleMaps"
> & {
  hintAvailable: boolean;
  claims?: PublicClaim[];
  ruleMaps?: PublicRuleMap[];
};

export type PublicSessionContent = Omit<SessionContent, "tasks"> & {
  tasks: PublicContentTask[];
};

export function toPublicSession(session: SessionContent): PublicSessionContent {
  return {
    ...session,
    tasks: session.tasks.map(
      ({ hintRu, claims, patternExpected, ruleMaps, ...task }) => {
        void patternExpected;
        return {
          ...task,
          ...(claims
            ? { claims: claims.map((claim) => ({ id: claim.id, text: claim.text })) }
            : {}),
          ...(ruleMaps
            ? {
                ruleMaps: ruleMaps.map((map) => {
                  const situation = normalizeRuleMap(map);
                  return {
                    id: situation.id,
                    signals: situation.signals,
                    ahead: situation.signals.ahead,
                  };
                }),
              }
            : {}),
          hintAvailable: Boolean(hintRu.trim()),
        };
      }
    ),
  };
}
