/**
 * W4 — all 15 sessions completable via choice-mode (deterministic, no live AI).
 * Proves red gate #7: session can finish without AI.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));
const { passingChoiceId, programForChoice } = require(join(root, "src/lib/tasks/choice-mode.ts"));
const {
  resolveGridAttempt,
  resolveSequenceAttempt,
  resolveRuleAttempt,
  resolvePatternAttempt,
  resolveClaimAttempt,
} = require(join(root, "src/lib/tasks/attempt.ts"));
const { sessionComplete } = require(join(root, "src/lib/tasks/session.ts"));

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
    const choiceId = passingChoiceId(task);
    const program = programForChoice(task, choiceId);
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
    check(`${session.id}/${task.id} choice-mode pass`, outcome.pass === true);
    if (outcome.pass) {
      results.push({
        id: task.id,
        role: task.role === "collision" ? "collision" : task.role,
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
      minTier: session.minTier,
    },
    results
  );
  check(`${session.id} sessionComplete`, done === true);
}

const outDir = join(root, "docs", "release", "_w4_drill_workspace");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "session-choice-matrix-receipt.md"),
  [
    "# W4 session choice-mode matrix (all 15)",
    "",
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    "Provider: deterministic choice-mode (no live AI)",
    "",
    ...lines,
    "",
    failed ? `FAILED: ${failed}` : "ALL GREEN",
  ].join("\n")
);

console.log(`\nW4 session matrix: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
