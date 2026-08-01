#!/usr/bin/env node

import { prisma } from "@/lib/prisma";
import {
  awardTaskPassCrystals,
  hasHintUnlocked,
  listPassedTaskIds,
  spendCrystalsForHint,
} from "@/lib/tasks/crystals";

const suffix = `${Date.now()}-${process.pid}`;
const createdUserIds = [];
let failed = 0;

function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failed += 1;
}

async function makeUser(tag) {
  const user = await prisma.user.create({
    data: { clerkId: `ownership-${tag}-${suffix}`, username: `ownership-${tag}-${suffix}`, crystals: 20 },
    select: { id: true },
  });
  createdUserIds.push(user.id);
  return user.id;
}

try {
  const userA = await makeUser("a");
  const userB = await makeUser("b");
  const sessionId = "w1-s1";
  const taskId = "w1s1-p1";

  const hintA = await spendCrystalsForHint({ userId: userA, sessionId, taskId, cost: 5 });
  const hintB = await spendCrystalsForHint({ userId: userB, sessionId, taskId, cost: 5 });
  check("each child independently pays for the same hint", hintA.ok && !hintA.alreadyOwned && hintB.ok && !hintB.alreadyOwned);

  const replayA = await spendCrystalsForHint({ userId: userA, sessionId, taskId, cost: 5 });
  check("same child hint replay remains idempotent", replayA.ok && replayA.alreadyOwned);

  const passA = await awardTaskPassCrystals({ userId: userA, sessionId, taskId, amount: 7 });
  const passB = await awardTaskPassCrystals({ userId: userB, sessionId, taskId, amount: 7 });
  check("each child independently receives the same task-pass award", passA.awarded && passB.awarded);

  const passReplayA = await awardTaskPassCrystals({ userId: userA, sessionId, taskId, amount: 7 });
  check("same child task-pass replay remains idempotent", !passReplayA.awarded);

  await prisma.rewardEvent.create({ data: { eventId: "hint:w1-s1:legacy-only", userId: userA, stepId: 0 } });
  check("legacy hint belongs only to its historical owner", (await hasHintUnlocked(userA, sessionId, "legacy-only")) && !(await hasHintUnlocked(userB, sessionId, "legacy-only")));

  await prisma.rewardEvent.create({ data: { eventId: "taskpass:w1-s1:legacy-pass", userId: userA, stepId: 0 } });
  const passedA = await listPassedTaskIds(userA, sessionId);
  const passedB = await listPassedTaskIds(userB, sessionId);
  check("legacy pass fallback is filtered by owner", passedA.includes("legacy-pass") && !passedB.includes("legacy-pass"));
} finally {
  await Promise.all(createdUserIds.map((userId) => prisma.rewardEvent.deleteMany({ where: { userId } })));
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
}

if (failed) process.exit(1);
console.log("TASK OWNERSHIP ISOLATION PASSED");
