export type {
  Cell,
  GridProgram,
  SequenceProgram,
  TaskFamilyId,
  UnclearReasonCode,
} from "./types";

export {
  GRID_SIZE,
  GRID_WORLD_PROMPT,
  checkGrid,
  executeGrid,
  normalizeGridProgram,
  renderGridDiff,
  type GridExecuteResult,
  type GridVerdict,
} from "./grid-draw";

export {
  SEQUENCE_ACTIONS,
  SEQUENCE_WORLD_PROMPT,
  checkSequence,
  executeSequence,
  normalizeSequenceProgram,
  renderSequenceDiff,
  type SequenceAction,
  type SequenceExecuteResult,
  type SequenceVerdict,
} from "./sequence-world";

export { unclearMessage, UNCLEAR_REASON_CODES } from "./unclear-copy";
export { attemptRequestSchema, gridProgramSchema, sequenceProgramSchema } from "./schemas";
export {
  coerceRawProgram,
  interpretUtterance,
  parseGridProgram,
  parseSequenceProgram,
  type ChatConn,
  type InterpretResult,
} from "./interpreter";
export { resolveGridAttempt, resolveSequenceAttempt, type AttemptOutcome } from "./attempt";
export { GRID_FIXTURES } from "./fixtures/grid-draw";
export { SEQUENCE_FIXTURES } from "./fixtures/sequence-world";
export { masteryAfterTask, tierForMastery } from "./mastery";
export { spacingAfterOutcome, pickReviewConcept, isDue } from "./spacing";
export { sessionComplete, type SessionDef, type SessionTaskResult } from "./session";
