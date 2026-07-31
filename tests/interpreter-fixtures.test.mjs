#!/usr/bin/env node
/**
 * Deterministic interpreter-literalness fixtures (Section 3A.4).
 * Uses fakeInterpretUtterance only — never a live AI provider.
 */
import {
  CLAIM_FIXTURES,
  GRID_FIXTURES,
  PATTERN_FIXTURES,
  RULE_FIXTURES,
  SEQUENCE_FIXTURES,
  fakeInterpretUtterance,
} from "../src/lib/tasks/index.ts";

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function cellsEqual(a, b) {
  if (a.length !== b.length) return false;
  const norm = (cells) =>
    [...cells]
      .map((c) => `${c[0]},${c[1]}`)
      .sort()
      .join("|");
  return norm(a) === norm(b);
}

console.log("\n=== fake interpreter: grid-draw ===");
{
  for (const fx of GRID_FIXTURES) {
    const got = fakeInterpretUtterance("grid-draw", fx.utterance);
    if (fx.expect.status === "ok") {
      // fixtures store 1-based; fake returns 0-based via parseGridProgram
      const expected0 = fx.expect.cells.map(([r, c]) => [r - 1, c - 1]);
      check(
        `${fx.id} → ok cells`,
        got.status === "ok" && "cells" in got && cellsEqual(got.cells, expected0),
        JSON.stringify(got)
      );
    } else {
      check(`${fx.id} → unclear`, got.status === "unclear", JSON.stringify(got));
    }
  }
  const misspelled = GRID_FIXTURES.find((f) => /закрась.*клетк/i.test(f.utterance) || f.id.includes("misspell"));
  // ensure at least one misspelled-style fixture exists in suite (sequence has explicit)
  check("grid fixture suite non-empty", GRID_FIXTURES.length >= 5);
  void misspelled;
}

console.log("\n=== fake interpreter: sequence-world (incl. misspelled) ===");
{
  for (const fx of SEQUENCE_FIXTURES) {
    const got = fakeInterpretUtterance("sequence-world", fx.utterance);
    if (fx.expect.status === "ok") {
      check(
        `${fx.id} → ok steps`,
        got.status === "ok" && "steps" in got && JSON.stringify(got.steps) === JSON.stringify(fx.expect.steps),
        JSON.stringify(got)
      );
    } else {
      check(`${fx.id} → unclear`, got.status === "unclear", JSON.stringify(got));
    }
  }
  const miss = SEQUENCE_FIXTURES.find((f) => f.id === "seq-misspelled");
  check("sequence misspelled fixture present", Boolean(miss));
  if (miss) {
    const got = fakeInterpretUtterance("sequence-world", miss.utterance);
    check(
      "misspelled sequence maps to knife+bread",
      got.status === "ok" && "steps" in got && got.steps[0] === "взять_нож"
    );
  }
}

console.log("\n=== fake interpreter: rule-runner (incl. misspelled) ===");
{
  for (const fx of RULE_FIXTURES) {
    const got = fakeInterpretUtterance("rule-runner", fx.utterance);
    if (fx.expect.status === "ok") {
      check(
        `${fx.id} → ok rules`,
        got.status === "ok" &&
          "rules" in got &&
          JSON.stringify(got.rules) === JSON.stringify(fx.expect.rules),
        JSON.stringify(got)
      );
    } else {
      check(`${fx.id} → unclear`, got.status === "unclear", JSON.stringify(got));
    }
  }
  const miss = RULE_FIXTURES.find((f) => f.id === "rule-misspelled");
  check("rule misspelled fixture present", Boolean(miss));
}

console.log("\n=== fake interpreter: pattern-expand (incl. misspelled) ===");
{
  for (const fx of PATTERN_FIXTURES) {
    const got = fakeInterpretUtterance("pattern-expand", fx.utterance);
    if (fx.expect.status === "ok") {
      check(
        `${fx.id} → ok rule`,
        got.status === "ok" &&
          "rule" in got &&
          JSON.stringify(got.rule) === JSON.stringify(fx.expect.rule),
        JSON.stringify(got)
      );
    } else {
      check(`${fx.id} → unclear`, got.status === "unclear", JSON.stringify(got));
    }
  }
  check(
    "pattern misspelled fixture present",
    Boolean(PATTERN_FIXTURES.find((f) => f.id === "pat-misspelled"))
  );
}

console.log("\n=== fake interpreter: claim-check (incl. misspelled) ===");
{
  for (const fx of CLAIM_FIXTURES) {
    const got = fakeInterpretUtterance("claim-check", fx.utterance);
    if (fx.expect.status === "ok") {
      check(
        `${fx.id} → ok labels`,
        got.status === "ok" &&
          "labels" in got &&
          JSON.stringify(got.labels) === JSON.stringify(fx.expect.labels),
        JSON.stringify(got)
      );
    } else {
      check(`${fx.id} → unclear`, got.status === "unclear", JSON.stringify(got));
    }
  }
  check(
    "claim misspelled fixture present",
    Boolean(CLAIM_FIXTURES.find((f) => f.id === "claim-misspelled"))
  );
}

console.log(
  `\n${fail === 0 ? "INTERPRETER FIXTURES: all passed" : `INTERPRETER FIXTURES: ${fail} FAILED`} (${pass} passed)\n`
);
process.exit(fail === 0 ? 0 : 1);
