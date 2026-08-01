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

export {
  RULE_RUNNER_PROMPT,
  checkRuleRunner,
  executeRuleRunner,
  renderRuleDiff,
  type ChildRule,
  type RuleMap,
  type RuleProgram,
  type RuleExecuteResult,
  type RuleVerdict,
} from "./rule-runner";

export {
  PATTERN_EXPAND_PROMPT,
  checkPattern,
  executePattern,
  hasExplicitPatternRule,
  renderPatternDiff,
  type PatternRule,
  type PatternProgram,
  type PatternExecuteResult,
  type PatternVerdict,
} from "./pattern-expand";

export {
  CLAIM_CHECK_PROMPT,
  checkClaimCheck,
  executeClaimCheck,
  renderClaimDiff,
  type Claim,
  type ClaimCheckProgram,
  type ClaimCheckResult,
  type ClaimCheckVerdict,
} from "./claim-check";

export { unclearMessage, UNCLEAR_REASON_CODES } from "./unclear-copy";
export {
  attemptRequestSchema,
  gridProgramSchema,
  sequenceProgramSchema,
  ruleProgramSchema,
  patternProgramSchema,
  claimProgramSchema,
  structuredProgramSchema,
  parseStructuredProgram,
  type StructuredProgram,
} from "./schemas";
export {
  coerceRawProgram,
  interpretUtterance,
  parseGridProgram,
  parseSequenceProgram,
  parseRuleProgram,
  parsePatternProgram,
  parseClaimProgram,
  type ChatConn,
  type InterpretResult,
} from "./interpreter";
export {
  resolveGridAttempt,
  resolveSequenceAttempt,
  resolveRuleAttempt,
  resolvePatternAttempt,
  resolveClaimAttempt,
  type AttemptOutcome,
} from "./attempt";
export { GRID_FIXTURES } from "./fixtures/grid-draw";
export { SEQUENCE_FIXTURES } from "./fixtures/sequence-world";
export { RULE_FIXTURES } from "./fixtures/rule-runner";
export { PATTERN_FIXTURES } from "./fixtures/pattern-expand";
export { CLAIM_FIXTURES } from "./fixtures/claim-check";
export { masteryAfterTask, tierForMastery } from "./mastery";
export { selectOfferedTier, effectiveTaskTier } from "./tier-select";
export {
  deriveResumeFromAttempts,
  curriculumAttemptEventId,
  parseCurriculumAttemptEventId,
  type AttemptEvidence,
  type ResumeDerivation,
} from "./resume";
export { spacingAfterOutcome, pickReviewConcept, isDue } from "./spacing";
export { sessionComplete, type SessionDef, type SessionTaskResult } from "./session";
export { fakeInterpretUtterance } from "./fake-interpreter";
