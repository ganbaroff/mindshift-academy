import type { TaskFamilyId } from "@/lib/tasks/types";

/** Crystal cost to reveal one task's scaffold hint. */
export const HINT_CRYSTAL_COST = 5;

/** Crystals earned on first pass of a thinking-curriculum task. */
export const TASK_PASS_CRYSTAL_REWARD = 3;

/** One-time starter balance so a child can buy early scaffolds. */
export const STARTER_CRYSTALS = 15;

export type ContentTask = {
  id: string;
  role: "collision" | "practice" | "transfer";
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
   * For grid-draw: 0-based target cells.
   * For sequence-world: omit (success = sandwich served).
   */
  target?: [number, number][];
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
};

/** Public session payload — hints stripped until purchased. */
export type PublicContentTask = Omit<ContentTask, "hintRu"> & {
  hintAvailable: boolean;
};

export type PublicSessionContent = Omit<SessionContent, "tasks"> & {
  tasks: PublicContentTask[];
};

export function toPublicSession(session: SessionContent): PublicSessionContent {
  return {
    ...session,
    tasks: session.tasks.map(({ hintRu: _hint, ...task }) => ({
      ...task,
      hintAvailable: Boolean(_hint?.trim()),
    })),
  };
}
