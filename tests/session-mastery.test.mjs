#!/usr/bin/env node
/** Pure Phase 3 gates: mastery, spacing, session completion, content validator. */
import { masteryAfterTask, tierForMastery } from "../src/lib/tasks/mastery.ts";
import { spacingAfterOutcome, pickReviewConcept, isDue } from "../src/lib/tasks/spacing.ts";
import { sessionComplete } from "../src/lib/tasks/session.ts";
import { loadCurriculum, validateSession } from "../src/content/curriculum/index.ts";
import { week1Session1 } from "../src/content/curriculum/week-1/session-1.ts";
import { week1Session2 } from "../src/content/curriculum/week-1/session-2.ts";
import { week1Session3 } from "../src/content/curriculum/week-1/session-3.ts";

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

console.log("\n=== mastery ===");
{
  check("pass tier1 raises", masteryAfterTask(0, true, 1) > 0);
  check("fail tier1 lowers from mid", masteryAfterTask(0.5, false, 1) < 0.5);
  check("hard pass raises more than easy", masteryAfterTask(0, true, 3) > masteryAfterTask(0, true, 1));
  check("clamped at 1", masteryAfterTask(0.95, true, 3) <= 1);
  check("tier ladder", tierForMastery(0.1) === 1 && tierForMastery(0.5) === 2 && tierForMastery(0.9) === 3);
}

console.log("\n=== spacing ===");
{
  const failSp = spacingAfterOutcome(3, false, new Date("2026-07-27T00:00:00Z"));
  check("fail resets step", failSp.intervalStep === 0);

  const passSp = spacingAfterOutcome(0, true, new Date("2026-07-27T00:00:00Z"));
  check("pass advances step", passSp.intervalStep === 1);
  check("pass sets future review", passSp.nextReviewAt?.getTime() > Date.parse("2026-07-27T00:00:00Z"));

  const now = new Date("2026-07-28T00:00:00Z");
  check("null nextReview is due", isDue(null, now));
  check(
    "pick overdue first",
    pickReviewConcept(
      [
        { concept: "a", intervalStep: 2, nextReviewAt: new Date("2026-07-29T00:00:00Z") },
        { concept: "b", intervalStep: 0, nextReviewAt: new Date("2026-07-27T00:00:00Z") },
      ],
      now
    ) === "b"
  );
}

console.log("\n=== session completion ===");
{
  const def = {
    id: "t",
    concept: "precision",
    practiceRequired: 3,
    requireTransfer: true,
    minTier: 1,
  };
  check(
    "incomplete without transfer",
    !sessionComplete(def, [
      { id: "1", role: "practice", pass: true, tier: 1 },
      { id: "2", role: "practice", pass: true, tier: 1 },
      { id: "3", role: "practice", pass: true, tier: 1 },
    ])
  );
  check(
    "complete with practice+transfer",
    sessionComplete(def, [
      { id: "1", role: "practice", pass: true, tier: 1 },
      { id: "2", role: "practice", pass: true, tier: 1 },
      { id: "3", role: "practice", pass: true, tier: 1 },
      { id: "t", role: "transfer", pass: true, tier: 1 },
    ])
  );
  check(
    "LLM-less path: fail practice blocks",
    !sessionComplete(def, [
      { id: "1", role: "practice", pass: false, tier: 1 },
      { id: "2", role: "practice", pass: true, tier: 1 },
      { id: "3", role: "practice", pass: true, tier: 1 },
      { id: "t", role: "transfer", pass: true, tier: 1 },
    ])
  );
}

console.log("\n=== content ===");
{
  for (const [label, session] of [
    ["week1 session1", week1Session1],
    ["week1 session2", week1Session2],
    ["week1 session3", week1Session3],
  ]) {
    const issues = validateSession(session);
    check(`${label} valid`, issues.length === 0, JSON.stringify(issues));
  }
  const all = loadCurriculum();
  check("curriculum loads 3 sessions", all.length === 3 && all.map((s) => s.id).join(",") === "w1-s1,w1-s2,w1-s3");
  check("has misconception", Boolean(all[0].misconception));
  check("has transfer", all.every((s) => s.tasks.some((t) => t.role === "transfer")));
  check(
    "practice count meets required",
    all.every((s) => s.tasks.filter((t) => t.role === "practice").length >= s.practiceRequired)
  );
}

console.log(`\n${fail === 0 ? "SESSION/MASTERY: all passed" : `SESSION/MASTERY: ${fail} FAILED`} (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
