/** Shared contracts for the executable-task engine (thinking curriculum). */

export type Cell = readonly [number, number];

export type RefusalStatus = "unclear";

/** Closed reason codes — Russian copy lives in product, never in model output. */
export type UnclearReasonCode =
  | "no_actions"
  | "ambiguous_cells"
  | "ambiguous_steps"
  | "out_of_vocabulary"
  | "not_an_instruction"
  | "do_nothing"
  | "copied_output";

export type GridProgram =
  | { status: "ok"; cells: Cell[] }
  | { status: RefusalStatus; reasonCode: UnclearReasonCode };

export type SequenceProgram =
  | { status: "ok"; steps: string[] }
  | { status: RefusalStatus; reasonCode: UnclearReasonCode };

export type TaskFamilyId =
  | "grid-draw"
  | "sequence-world"
  | "rule-runner"
  | "pattern-expand"
  | "claim-check";
