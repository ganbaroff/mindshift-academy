/**
 * Deterministic half of a task attempt: program → execute → check → child-facing payload.
 * No LLM. Progression (pass) comes only from here.
 */

import { checkGrid, executeGrid, renderGridDiff } from "./grid-draw";
import { checkSequence, executeSequence, renderSequenceDiff, sequenceWorld } from "./sequence-world";
import {
  checkRuleRunner,
  executeRuleRunner,
  renderRuleDiff,
  type ChildRule,
  type RuleMap,
} from "./rule-runner";
import {
  checkPattern,
  executePattern,
  renderPatternDiff,
  type PatternRule,
} from "./pattern-expand";
import {
  checkClaimCheck,
  executeClaimCheck,
  renderClaimDiff,
  type Claim,
} from "./claim-check";
import { unclearMessage } from "./unclear-copy";
import type { Cell, GridProgram, SequenceProgram, TaskFamilyId, UnclearReasonCode } from "./types";

export type AttemptOutcome = {
  family: TaskFamilyId;
  pass: boolean;
  /** Monster voice — never blame language, never model free-text. */
  feedback: string;
  programStatus: "ok" | "unclear";
  reasonCode?: string;
  filledCells?: Cell[];
  missingCells?: Cell[];
  extraCells?: Cell[];
};

function unclearOutcome(
  family: TaskFamilyId,
  reasonCode: string
): AttemptOutcome {
  return {
    family,
    pass: false,
    feedback: unclearMessage(reasonCode as UnclearReasonCode),
    programStatus: "unclear",
    reasonCode,
  };
}

export function resolveGridAttempt(
  program: GridProgram,
  target: Cell[],
  opts: { hideTargetPanel?: boolean } = {}
): AttemptOutcome {
  if (program.status !== "ok") {
    return unclearOutcome("grid-draw", program.reasonCode);
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
    missingCells: opts.hideTargetPanel ? undefined : verdict.missing,
    extraCells: verdict.extra,
  };
}

export function resolveSequenceAttempt(
  program: SequenceProgram,
  worldId?: string | null
): AttemptOutcome {
  if (program.status !== "ok") {
    return unclearOutcome("sequence-world", program.reasonCode);
  }
  const result = executeSequence(program, sequenceWorld(worldId));
  const verdict = checkSequence(result);
  return {
    family: "sequence-world",
    pass: verdict.pass,
    feedback: renderSequenceDiff(result, verdict),
    programStatus: "ok",
  };
}

export function resolveRuleAttempt(
  program: { status: "ok"; rules: ChildRule[] } | { status: "unclear"; reasonCode: string },
  maps: RuleMap[]
): AttemptOutcome {
  if (program.status !== "ok") {
    return unclearOutcome("rule-runner", program.reasonCode);
  }
  const result = executeRuleRunner(program, maps);
  const verdict = checkRuleRunner(result);
  return {
    family: "rule-runner",
    pass: verdict.pass,
    feedback: renderRuleDiff(result, verdict),
    programStatus: "ok",
  };
}

export function resolvePatternAttempt(
  program: { status: "ok"; rule: PatternRule } | { status: "unclear"; reasonCode: string },
  expected: string[],
  expandCount?: number
): AttemptOutcome {
  if (program.status !== "ok") {
    return unclearOutcome("pattern-expand", program.reasonCode);
  }
  const count = expandCount ?? expected.length;
  const result = executePattern(program, count);
  const verdict = checkPattern(result, expected);
  return {
    family: "pattern-expand",
    pass: verdict.pass,
    feedback: renderPatternDiff(result, expected, verdict),
    programStatus: "ok",
    reasonCode: verdict.ruleIssue,
  };
}

export function resolveClaimAttempt(
  program:
    | { status: "ok"; labels: Record<string, boolean> }
    | { status: "unclear"; reasonCode: string },
  claims: Claim[]
): AttemptOutcome {
  if (program.status !== "ok") {
    return unclearOutcome("claim-check", program.reasonCode);
  }
  const result = executeClaimCheck(program, claims);
  const verdict = checkClaimCheck(result);
  return {
    family: "claim-check",
    pass: verdict.pass,
    feedback: renderClaimDiff(result, verdict),
    programStatus: "ok",
  };
}
