#!/usr/bin/env node

import {
  attemptRequestSchema,
  parseStructuredProgram,
} from "../src/lib/tasks/schemas.ts";
import { loadCurriculum, toPublicSession } from "../src/content/curriculum/index.ts";

let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}`);
  }
}

console.log("\n=== structured attempt request ===");
const base = {
  sessionId: "w1-s1",
  taskId: "w1s1-p1",
  eventId: "structured-contract-event",
};
const gridProgram = { status: "ok", cells: [[0, 0]] };
check(
  "accepts one structured program without utterance",
  attemptRequestSchema.safeParse({ ...base, program: gridProgram }).success
);
check(
  "rejects text plus structured program",
  !attemptRequestSchema.safeParse({ ...base, utterance: "верхняя клетка", program: gridProgram }).success
);
check(
  "rejects choice plus structured program",
  !attemptRequestSchema.safeParse({ ...base, choiceId: "legacy", program: gridProgram }).success
);
check(
  "server family rejects a different program shape",
  parseStructuredProgram("claim-check", gridProgram) === null
);
check(
  "unclear program cannot become an assessed structured attempt",
  parseStructuredProgram("grid-draw", {
    status: "unclear",
    reasonCode: "ambiguous_cells",
  }) === null
);

console.log("\n=== public curriculum answer stripping ===");
const sessions = loadCurriculum();
const patternSession = toPublicSession(sessions.find((session) => session.id === "w4-s1"));
const ruleSession = toPublicSession(sessions.find((session) => session.id === "w3-s1"));
const claimSession = toPublicSession(sessions.find((session) => session.id === "w5-s1"));

check(
  "pattern expected output is server-only",
  patternSession.tasks.every((task) => !("patternExpected" in task))
);
check(
  "rule success conditions are server-only",
  ruleSession.tasks.every((task) =>
    (task.ruleMaps ?? []).every((map) => !("successWhen" in map))
  )
);
check(
  "claim truth remains server-only",
  claimSession.tasks.every((task) =>
    (task.claims ?? []).every((claim) => !("truth" in claim))
  )
);

console.log(`\nTASK PROGRAM CONTRACT: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
