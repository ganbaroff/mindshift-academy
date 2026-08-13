#!/usr/bin/env node
/**
 * Tier 3 must change the TASK, not the hint.
 *
 * The defect this gate exists for: until 2026-08-13 `tier` altered exactly one line of copy,
 * so a child at tier 3 was handed the identical task a child at tier 1 got. Every assertion
 * below is written against real slack in the sequence engine — `checkSequence` bounds nothing
 * but the goal counter, and every world's terminal action has no self-cap — so each of these
 * plans PASSES at tier 1 and 2 today. If the demand ever becomes a no-op, the first two
 * blocks go red.
 *
 * No network, no LLM, no database.
 */
import {
  applyTierThreeDemand,
  checkSequenceEconomy,
  TIER_THREE_FEEDBACK,
} from "../src/lib/tasks/tier-demand.ts";
import {
  sequenceWorld,
  executeSequence,
  checkSequence,
} from "../src/lib/tasks/sequence-world.ts";

let passed = 0;
let failed = 0;
function check(name, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const WORLDS = ["sandwich", "plant", "leaving"];
const passingOutcome = {
  family: "sequence-world",
  pass: true,
  feedback: "исходный текст движка",
  programStatus: "ok",
};

function demand(tier, steps, worldId, outcome = passingOutcome) {
  return applyTierThreeDemand({
    tier,
    family: "sequence-world",
    outcome,
    program: { status: "ok", steps },
    worldId,
  });
}

console.log("\n=== the slack this rule closes is real, not imagined ===");
// If the engine already refused these plans, the whole tier-3 demand would be theatre.
// This block asserts the premise directly against the engine, so the day someone bounds
// step count inside `checkSequence`, this gate says so instead of quietly agreeing.
for (const worldId of WORLDS) {
  const world = sequenceWorld(worldId);
  const declared = world.actions.map((a) => a.id ?? a);
  const withDuplicate = [...declared, declared[declared.length - 1]];
  const verdict = checkSequence(
    executeSequence({ status: "ok", steps: withDuplicate }, world)
  );
  check(
    `${worldId}: the engine itself still passes a plan with a repeated last step`,
    verdict.pass === true,
    JSON.stringify(verdict)
  );
}

console.log("\n=== the canonical solution is never refused ===");
for (const worldId of WORLDS) {
  const declared = sequenceWorld(worldId).actions.map((a) => a.id ?? a);
  const verdict = checkSequenceEconomy(declared, worldId);
  check(
    `${worldId}: the world's own declared order survives the economy rule`,
    verdict.ok === true,
    JSON.stringify(verdict)
  );
  check(
    `${worldId}: and still passes through applyTierThreeDemand at tier 3`,
    demand(3, declared, worldId).pass === true
  );
}

console.log("\n=== tier 3 refuses a repeated step ===");
for (const worldId of WORLDS) {
  const declared = sequenceWorld(worldId).actions.map((a) => a.id ?? a);
  // The terminal action is the one the engine tolerates twice in every world — the
  // exact slack this rule closes.
  const withDuplicate = [...declared, declared[declared.length - 1]];
  const out = demand(3, withDuplicate, worldId);
  check(`${worldId}: a duplicated step fails at tier 3`, out.pass === false);
  check(
    `${worldId}: and the child is told why, in closed copy`,
    out.feedback === TIER_THREE_FEEDBACK.duplicate,
    out.feedback
  );
  check(
    `${worldId}: with a reason code the client can branch on`,
    out.reasonCode === "TIER3_DUPLICATE",
    String(out.reasonCode)
  );
}

console.log("\n=== the same plan still passes below tier 3 ===");
for (const tier of [1, 2]) {
  for (const worldId of WORLDS) {
    const declared = sequenceWorld(worldId).actions.map((a) => a.id ?? a);
    const withDuplicate = [...declared, declared[declared.length - 1]];
    const out = demand(tier, withDuplicate, worldId);
    check(
      `${worldId}: tier ${tier} leaves the engine's verdict alone`,
      out.pass === true && out.feedback === passingOutcome.feedback
    );
  }
}

console.log("\n=== tier 3 refuses a plan longer than the world ===");
{
  const declared = sequenceWorld("sandwich").actions.map((a) => a.id ?? a);
  const lengthOnly = [...declared, "лишний_шаг_1"];
  // Guard the guard: if this fixture ever carried a duplicate it would trip the other
  // branch and leave `tooLong` uncovered while still looking green.
  check(
    "the length fixture holds no duplicate",
    new Set(lengthOnly).size === lengthOnly.length
  );
  const out = demand(3, lengthOnly, "sandwich");
  check("a plan longer than the declared world fails at tier 3", out.pass === false);
  check(
    "and says it is about extra steps, not repeats",
    out.feedback === TIER_THREE_FEEDBACK.tooLong,
    out.feedback
  );
}

console.log("\n=== the demand can never manufacture a pass ===");
{
  const failing = { ...passingOutcome, pass: false, feedback: "движок отказал" };
  const declared = sequenceWorld("plant").actions.map((a) => a.id ?? a);
  const out = demand(3, declared, "plant", failing);
  check("a failed attempt stays failed", out.pass === false);
  check("and keeps the engine's own words", out.feedback === "движок отказал");
}

console.log("\n=== families without a tier-3 demand are untouched ===");
for (const family of ["grid-draw", "rule-runner", "pattern-expand", "claim-check"]) {
  const out = applyTierThreeDemand({
    tier: 3,
    family,
    outcome: { ...passingOutcome, family },
    program: { status: "ok", steps: ["a", "a", "a"] },
    worldId: null,
  });
  check(`${family}: passes through unchanged at tier 3`, out.pass === true);
}

console.log("\n=== an unparsed program is never judged ===");
{
  const unclear = {
    family: "sequence-world",
    pass: false,
    feedback: "не понял",
    programStatus: "unclear",
    reasonCode: "TOO_VAGUE",
  };
  const out = applyTierThreeDemand({
    tier: 3,
    family: "sequence-world",
    outcome: unclear,
    program: { status: "unclear" },
    worldId: "sandwich",
  });
  check("an unclear program keeps its own reason code", out.reasonCode === "TOO_VAGUE");
}

console.log(
  `\nTIER DEMAND: ${failed === 0 ? "all passed" : "FAILURES"} (${passed} passed, ${failed} failed)`
);
process.exit(failed === 0 ? 0 : 1);
