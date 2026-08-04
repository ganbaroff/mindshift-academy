/**
 * Deterministic fake interpreter for CI (Section 3A.4).
 * Looks up known fixture utterances — never calls a live provider.
 */
import { GRID_FIXTURES } from "./fixtures/grid-draw";
import { SEQUENCE_FIXTURES } from "./fixtures/sequence-world";
import { RULE_FIXTURES } from "./fixtures/rule-runner";
import { PATTERN_FIXTURES } from "./fixtures/pattern-expand";
import { CLAIM_FIXTURES } from "./fixtures/claim-check";
import { parseGridProgram, parseSequenceProgram } from "./interpreter";
import type { TaskFamilyId } from "./types";
import type { ChildRule } from "./rule-runner";
import { hasExplicitPatternRule, type PatternRule } from "./pattern-expand";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export type FakeProgram =
  | { status: "ok"; cells: number[][] }
  | { status: "ok"; steps: string[] }
  | { status: "ok"; rules: ChildRule[] }
  | { status: "ok"; rule: PatternRule }
  | { status: "ok"; labels: Record<string, boolean> }
  | { status: "unclear"; reasonCode: string };

export function fakeInterpretUtterance(
  family: TaskFamilyId,
  utterance: string
): FakeProgram {
  const key = norm(utterance);

  if (family === "grid-draw") {
    const fx = GRID_FIXTURES.find((f) => norm(f.utterance) === key);
    if (!fx) return { status: "unclear", reasonCode: "not_an_instruction" };
    if (fx.expect.status === "not-ok") {
      return { status: "unclear", reasonCode: "ambiguous_cells" };
    }
    // Product parse expects 1-based then converts — return via parseGridProgram path shape
    const raw = { status: "ok" as const, cells: fx.expect.cells };
    const program = parseGridProgram(raw);
    if (program.status !== "ok") return { status: "unclear", reasonCode: "ambiguous_cells" };
    return { status: "ok", cells: program.cells.map((c) => [...c]) };
  }

  if (family === "sequence-world") {
    const fx = SEQUENCE_FIXTURES.find((f) => norm(f.utterance) === key);
    if (!fx) return { status: "unclear", reasonCode: "not_an_instruction" };
    if (fx.expect.status === "not-ok") {
      return { status: "unclear", reasonCode: "ambiguous_steps" };
    }
    const program = parseSequenceProgram({ status: "ok", steps: fx.expect.steps });
    if (program.status !== "ok") return { status: "unclear", reasonCode: "ambiguous_steps" };
    return { status: "ok", steps: program.steps };
  }

  if (family === "rule-runner") {
    const fx = RULE_FIXTURES.find((f) => norm(f.utterance) === key);
    if (!fx) return { status: "unclear", reasonCode: "not_an_instruction" };
    if (fx.expect.status === "not-ok") {
      return { status: "unclear", reasonCode: "ambiguous_steps" };
    }
    return { status: "ok", rules: fx.expect.rules };
  }

  if (family === "pattern-expand") {
    if (!hasExplicitPatternRule(utterance)) {
      return { status: "unclear", reasonCode: "copied_output" };
    }
    const fx = PATTERN_FIXTURES.find((f) => norm(f.utterance) === key);
    if (!fx) return { status: "unclear", reasonCode: "not_an_instruction" };
    if (fx.expect.status === "not-ok") {
      return { status: "unclear", reasonCode: "ambiguous_steps" };
    }
    return { status: "ok", rule: fx.expect.rule };
  }

  if (family === "claim-check") {
    const fx = CLAIM_FIXTURES.find((f) => norm(f.utterance) === key);
    if (!fx) return { status: "unclear", reasonCode: "not_an_instruction" };
    if (fx.expect.status === "not-ok") {
      return { status: "unclear", reasonCode: "ambiguous_steps" };
    }
    return { status: "ok", labels: fx.expect.labels };
  }

  return { status: "unclear", reasonCode: "not_an_instruction" };
}
