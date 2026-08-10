/**
 * W4 — authored deterministic programs can complete all 15 sessions.
 * This is an engine/content matrix, not browser or degraded-mode evidence.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shouldWriteLegacyReceipts = process.env.ACADEMY_WRITE_LEGACY_RECEIPTS === "1";
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));
const {
  resolveGridAttempt,
  resolveSequenceAttempt,
  resolveRuleAttempt,
  resolvePatternAttempt,
  resolveClaimAttempt,
} = require(join(root, "src/lib/tasks/attempt.ts"));
const { sessionComplete } = require(join(root, "src/lib/tasks/session.ts"));

const PASSING_SEQUENCE = [
  "взять_нож",
  "положить_хлеб",
  "намазать_масло",
  "положить_сыр",
  "накрыть_хлебом",
  "подать",
];

function smallestCycle(items) {
  for (let size = 1; size < items.length; size++) {
    if (items.every((item, index) => item === items[index % size])) {
      return items.slice(0, size);
    }
  }
  return null;
}

function authoredPassingProgram(task) {
  if (task.family === "grid-draw") {
    return task.target?.length ? { status: "ok", cells: task.target } : null;
  }
  if (task.family === "sequence-world") {
    return { status: "ok", steps: PASSING_SEQUENCE };
  }
  if (task.family === "rule-runner") {
    return {
      status: "ok",
      rules: [
        { if: { kind: "tile", value: "open" }, then: "step" },
        { if: { kind: "tile", value: "goal" }, then: "step" },
        { if: { kind: "tile", value: "wall" }, then: "wait" },
        { if: { kind: "tile", value: "trap" }, then: "stop" },
      ],
    };
  }
  if (task.family === "pattern-expand" && task.patternExpected?.length) {
    const nums = task.patternExpected.map(Number);
    if (nums.length >= 2 && nums.every(Number.isFinite)) {
      const step = nums[1] - nums[0];
      if (nums.every((value, index) => value === nums[0] + step * index)) {
        return { status: "ok", rule: { kind: "arithmetic", start: nums[0], step } };
      }
    }
    const items = smallestCycle(task.patternExpected);
    return items ? { status: "ok", rule: { kind: "cycle", items } } : null;
  }
  if (task.family === "claim-check" && task.claims?.length) {
    return {
      status: "ok",
      labels: Object.fromEntries(task.claims.map((claim) => [claim.id, claim.truth])),
    };
  }
  return null;
}

let passed = 0;
let failed = 0;
const lines = [];
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
    lines.push(`- PASS ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    lines.push(`- FAIL ${name}${detail ? ` (${detail})` : ""}`);
  }
}

const sessions = loadCurriculum();
check("curriculum has 15 sessions", sessions.length === 15);

for (const session of sessions) {
  const results = [];
  for (const task of session.tasks) {
    const program = authoredPassingProgram(task);
    if (!program || program.status !== "ok") {
      check(`${session.id}/${task.id} program`, false, "no program");
      continue;
    }
    let outcome;
    try {
      outcome =
        task.family === "grid-draw"
          ? resolveGridAttempt(program, task.target, { hideTargetPanel: task.role === "collision" })
          : task.family === "sequence-world"
            ? resolveSequenceAttempt(program)
            : task.family === "rule-runner"
              ? resolveRuleAttempt(program, task.ruleMaps)
              : task.family === "pattern-expand"
                ? resolvePatternAttempt(program, task.patternExpected, task.patternExpandCount)
                : resolveClaimAttempt(program, task.claims);
    } catch (e) {
      check(`${session.id}/${task.id} execute`, false, String(e.message || e));
      continue;
    }
    check(`${session.id}/${task.id} authored program pass`, outcome.pass === true);
    if (outcome.pass) {
      results.push({
        id: task.id,
        role: task.role,
        pass: true,
        tier: task.tier,
      });
    }
  }
  const done = sessionComplete(
    {
      id: session.id,
      concept: session.concept,
      practiceRequired: session.practiceRequired,
      requireTransfer: true,
      requireCollision: session.requireCollision,
      requirePrediction: session.requirePrediction,
      minTier: session.minTier,
    },
    results
  );
  check(`${session.id} sessionComplete`, done === true);
}

const outDir = join(root, "docs", "release", "_w4_drill_workspace");
if (shouldWriteLegacyReceipts) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "session-choice-matrix-receipt.md"),
    [
      "# W4 authored deterministic session matrix (all 15)",
      "",
      `Date: ${new Date().toISOString().slice(0, 10)}`,
      "Provider: deterministic test programs (no live AI; not browser evidence)",
      "",
      ...lines,
      "",
      failed ? `FAILED: ${failed}` : "ALL GREEN",
    ].join("\n")
  );
}

console.log(`\nW4 session matrix: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
