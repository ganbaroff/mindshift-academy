/**
 * Legacy degraded-mode contract. It must never derive a passing answer from
 * server-side task payloads. Interactive deterministic surfaces own recovery.
 */

import type { ContentTask } from "@/content/curriculum/types";
import type { GridProgram, SequenceProgram } from "@/lib/tasks/types";
import type { RuleProgram } from "@/lib/tasks/rule-runner";
import type { PatternProgram } from "@/lib/tasks/pattern-expand";
import type { ClaimCheckProgram } from "@/lib/tasks/claim-check";

export type ChoiceOption = {
  id: string;
  labelRu: string;
};

export type ChoiceProgram =
  | GridProgram
  | SequenceProgram
  | RuleProgram
  | PatternProgram
  | ClaimCheckProgram;

export function buildChoiceOptions(task: ContentTask): ChoiceOption[] {
  void task;
  return [];
}

/** Never convert a fallback choice into assessed work. */
export function programForChoice(
  task: ContentTask,
  choiceId: string
): ChoiceProgram | null {
  void task;
  void choiceId;
  return null;
}

/** Kept temporarily for legacy callers; it is deliberately non-passing. */
export function passingChoiceId(task: ContentTask): string {
  void task;
  return "unavailable";
}
