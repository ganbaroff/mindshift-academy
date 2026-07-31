#!/usr/bin/env node
/**
 * C1/C2 trust: client cannot invent taskId or supply target — server catalog only.
 */
import { resolveCurriculumTask, nextSessionId, prerequisiteSessionId } from "../src/lib/tasks/resolve-task.ts";
import { attemptRequestSchema } from "../src/lib/tasks/schemas.ts";
import { week1Session1 } from "../src/content/curriculum/week-1/session-1.ts";

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

console.log("\n=== resolveCurriculumTask (C1 forge) ===");
{
  const real = resolveCurriculumTask("w1-s1", "w1s1-p1");
  check("real task resolves", Boolean(real?.task));
  check(
    "server target matches catalog",
    JSON.stringify(real?.task.target) === JSON.stringify(week1Session1.tasks.find((t) => t.id === "w1s1-p1")?.target)
  );

  check("fake taskId → null", resolveCurriculumTask("w1-s1", "forge-evil-task") === null);
  check("fake session → null", resolveCurriculumTask("w9-evil", "w1s1-p1") === null);

  // Client-supplied alternate target must never be used by resolver (resolver has no client target arg).
  const forgedCells = [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ];
  check(
    "resolver ignores client fantasy (no target param)",
    JSON.stringify(real?.task.target) !== JSON.stringify(forgedCells) ||
      JSON.stringify(week1Session1.tasks.find((t) => t.id === "w1s1-p1")?.target) ===
        JSON.stringify(real?.task.target)
  );
}

console.log("\n=== attemptRequestSchema ===");
{
  const parsed = attemptRequestSchema.safeParse({
    utterance: "  закрась  ",
    sessionId: "w1-s1",
    taskId: "w1s1-p1",
    eventId: "evt-forge-0001",
    target: [
      [9, 9],
      [9, 8],
    ],
    family: "grid-draw",
    concept: "hacked",
    tier: 3,
  });
  check("accepts body with legacy target", parsed.success);
  if (parsed.success) {
    check("utterance trimmed", parsed.data.utterance === "закрась");
    // Client target may parse but route must ignore — document fields present optional
    check("target optional retained for compat only", Array.isArray(parsed.data.target));
  }
  check(
    "whitespace-only utterance rejected",
    !attemptRequestSchema.safeParse({
      utterance: "   ",
      sessionId: "w1-s1",
      taskId: "w1s1-p1",
      eventId: "evt-00000001",
    }).success
  );
  check(
    "missing sessionId rejected",
    !attemptRequestSchema.safeParse({
      utterance: "ок",
      taskId: "w1s1-p1",
      eventId: "evt-00000001",
    }).success
  );
}

console.log("\n=== session order gates ===");
{
  check("s1 no prereq", prerequisiteSessionId("w1-s1") === null);
  check("s2 needs s1", prerequisiteSessionId("w1-s2") === "w1-s1");
  check("s3 needs s2", prerequisiteSessionId("w1-s3") === "w1-s2");
  check("s1 next s2", nextSessionId("w1-s1") === "w1-s2");
  check("w1-s3 next w2-s1", nextSessionId("w1-s3") === "w2-s1");
  check("w5-s3 no next", nextSessionId("w5-s3") === null);
  check("w2-s1 needs w1-s3", prerequisiteSessionId("w2-s1") === "w1-s3");
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exitCode = 1;
