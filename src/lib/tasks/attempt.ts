/**
 * Deterministic half of a task attempt: program → execute → check → child-facing payload.
 * No LLM. Progression (pass) comes only from here.
 */

import { checkGrid, executeGrid, renderGridDiff } from "./grid-draw";
import { checkSequence, executeSequence, renderSequenceDiff } from "./sequence-world";
import { unclearMessage } from "./unclear-copy";
import type { Cell, GridProgram, SequenceProgram, TaskFamilyId } from "./types";

export type AttemptOutcome = {
  family: TaskFamilyId;
  pass: boolean;
  /** Monster voice — never blame language, never model free-text. */
  feedback: string;
  programStatus: "ok" | "unclear";
  reasonCode?: string;
};

export function resolveGridAttempt(program: GridProgram, target: Cell[]): AttemptOutcome {
  if (program.status !== "ok") {
    return {
      family: "grid-draw",
      pass: false,
      feedback: unclearMessage(program.reasonCode),
      programStatus: "unclear",
      reasonCode: program.reasonCode,
    };
  }
  const result = executeGrid(program);
  const verdict = checkGrid(result, target);
  return {
    family: "grid-draw",
    pass: verdict.pass,
    feedback: renderGridDiff(result, target, verdict),
    programStatus: "ok",
  };
}

export function resolveSequenceAttempt(program: SequenceProgram): AttemptOutcome {
  if (program.status !== "ok") {
    return {
      family: "sequence-world",
      pass: false,
      feedback: unclearMessage(program.reasonCode),
      programStatus: "unclear",
      reasonCode: program.reasonCode,
    };
  }
  const result = executeSequence(program);
  const verdict = checkSequence(result);
  return {
    family: "sequence-world",
    pass: verdict.pass,
    feedback: renderSequenceDiff(result, verdict),
    programStatus: "ok",
  };
}
