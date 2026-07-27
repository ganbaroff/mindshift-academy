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
  /** Populated for grid-draw when program parsed successfully. */
  filledCells?: Cell[];
  missingCells?: Cell[];
  extraCells?: Cell[];
};

export function resolveGridAttempt(
  program: GridProgram,
  target: Cell[],
  opts: { hideTargetPanel?: boolean } = {}
): AttemptOutcome {
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
  const filledCells: Cell[] = [...result.filled].map((k) => {
    const [r, c] = k.split(",").map(Number);
    return [r, c];
  });
  return {
    family: "grid-draw",
    pass: verdict.pass,
    feedback: renderGridDiff(result, target, verdict, {
      hideTargetPanel: opts.hideTargetPanel,
    }),
    programStatus: "ok",
    filledCells,
    // Collision: don't ship missing cell list (encodes the hidden goal).
    missingCells: opts.hideTargetPanel ? undefined : verdict.missing,
    extraCells: verdict.extra,
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
