#!/usr/bin/env node

let passed = 0;
let failed = 0;
function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const [{ POST }, { week1Session1 }, { prisma }] = await Promise.all([
  import("../src/app/api/tasks/attempt/route.ts"),
  import("../src/content/curriculum/week-1/session-1.ts"),
  import("../src/lib/prisma.ts"),
]);

const task = week1Session1.tasks.find((item) => item.id === "w1s1-p1");
if (!task?.target) throw new Error("structured route fixture task is missing");

const response = await POST(
  new Request("http://localhost/api/tasks/attempt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-test-bypass": "true",
    },
    body: JSON.stringify({
      sessionId: week1Session1.id,
      taskId: task.id,
      eventId: "structured-route-event-0001",
      program: { status: "ok", cells: task.target },
    }),
  })
);
const body = await response.json();

console.log("\n=== structured route under tutor degradation ===");
check("request succeeds", response.status === 200, `status=${response.status}`);
check("deterministic checker passes", body.pass === true);
check("structured path is identified", body.model === "structured-ui");
check(
  "provider token cost stays zero",
  body.sessionCost?.promptTokens === 0 && body.sessionCost?.completionTokens === 0
);
check("normal finalizer records attempt", body.recorded === true);

const persisted = await prisma.taskAttempt.findUnique({
  where: { eventId: "structured-route-event-0001" },
  select: { sessionId: true, taskId: true, pass: true },
});
check(
  "attempt persists through the normal trust boundary",
  persisted?.sessionId === week1Session1.id &&
    persisted.taskId === task.id &&
    persisted.pass === true
);

await prisma.$disconnect();
console.log(`\nSTRUCTURED ROUTE: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
