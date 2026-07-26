import type { TaskFamilyId } from "@/lib/tasks/types";

export type ContentTask = {
  id: string;
  role: "collision" | "practice" | "transfer";
  family: TaskFamilyId;
  /** Authoring hint; runtime may raise/lower via mastery. */
  tier: 1 | 2 | 3;
  /** Human-readable prompt shown to the child (not the answer). */
  promptRu: string;
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
