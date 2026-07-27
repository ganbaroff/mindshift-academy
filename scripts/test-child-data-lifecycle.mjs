#!/usr/bin/env node
/** Real local-DB contract for restart versus permanent child-data deletion. */
import { register } from "node:module";
register("./alias-loader.mjs", import.meta.url);

const { prisma } = await import("@/lib/prisma");
const { restartChildData, deleteChildData } = await import("@/lib/child-data");

const suffix = `${Date.now()}_${process.pid}`;
const clerkId = `child_data_test_${suffix}`;
const username = `child_data_${suffix}`;
const lessonOrder = 90000 + (process.pid % 10000);
let lessonId = null;
let userId = null;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failed += 1;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

try {
  const lesson = await prisma.lesson.upsert({
    where: { order: lessonOrder },
    update: {},
    create: {
      order: lessonOrder,
      title: "Lifecycle test lesson",
      description: "isolated fixture",
      xpReward: 1,
      crystalRwd: 1,
    },
  });
  lessonId = lesson.id;

  const user = await prisma.user.create({
    data: {
      clerkId,
      username,
      xp: 900,
      crystals: 90,
      streak: 7,
      activeStep: 5,
      monster: {
        create: {
          name: "Fixture",
          emoji: "🧪",
          color: "#000000",
          promptUsed: "[redacted]",
        },
      },
      inventory: { create: [{ itemType: "skin", itemId: `fixture_${suffix}` }] },
      progress: { create: [{ lessonId: lesson.id, completed: true, score: 100 }] },
    },
  });
  userId = user.id;
  await prisma.rewardEvent.create({
    data: { eventId: `event_${suffix}`, userId: user.id, stepId: 1 },
  });
  await prisma.parentalConsent.create({
    data: {
      clerkId,
      parentEmail: "parent@example.test",
      consentVersion: "2026-06-28",
      serviceConsent: true,
      externalAiConsent: true,
      verifiedAt: new Date(),
    },
  });
  await prisma.consentVerification.create({
    data: {
      clerkId,
      parentEmail: "parent@example.test",
      codeHash: "fixture-hash",
      salt: "fixture-salt",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await prisma.conceptMastery.create({
    data: { userId: user.id, concept: "precision", mastery: 0.6, intervalStep: 2 },
  });
  await prisma.taskAttempt.create({
    data: {
      userId: user.id,
      concept: "precision",
      family: "grid-draw",
      tier: 1,
      pass: true,
      eventId: `task_${suffix}`,
    },
  });

  const restart = await restartChildData(clerkId);
  const restarted = await prisma.user.findUnique({
    where: { clerkId },
    include: { monster: true, inventory: true, progress: true },
  });
  const restartEvents = await prisma.rewardEvent.count({ where: { userId: user.id } });
  const restartMastery = await prisma.conceptMastery.count({ where: { userId: user.id } });
  const restartAttempts = await prisma.taskAttempt.count({ where: { userId: user.id } });
  const retainedConsent = await prisma.parentalConsent.count({ where: { clerkId } });
  const retainedVerification = await prisma.consentVerification.count({ where: { clerkId } });

  check("restart finds current parent record", restart.found === true);
  check(
    "restart clears gameplay state but keeps consent",
    restarted?.xp === 0 &&
      restarted?.crystals === 0 &&
      restarted?.streak === 0 &&
      restarted?.activeStep === 1 &&
      restarted?.monster === null &&
      restarted?.inventory.length === 0 &&
      restarted?.progress.length === 0 &&
      restartEvents === 0 &&
      restartMastery === 0 &&
      restartAttempts === 0 &&
      retainedConsent === 1 &&
      retainedVerification === 1,
    `state=${JSON.stringify({ restarted, restartEvents, retainedConsent, retainedVerification })}`
  );

  const deletion = await deleteChildData(clerkId);
  const deletedUser = await prisma.user.findUnique({ where: { clerkId } });
  const leftovers = await Promise.all([
    prisma.rewardEvent.count({ where: { userId: user.id } }),
    prisma.conceptMastery.count({ where: { userId: user.id } }),
    prisma.taskAttempt.count({ where: { userId: user.id } }),
    prisma.parentalConsent.count({ where: { clerkId } }),
    prisma.consentVerification.count({ where: { clerkId } }),
  ]);
  check("permanent deletion finds current parent record", deletion.found === true);
  check(
    "permanent deletion removes user, consent, verification, and reward records",
    deletedUser === null && leftovers.every((count) => count === 0),
    `user=${deletedUser?.id ?? "null"} leftovers=${leftovers.join(",")}`
  );
} catch (error) {
  failed += 1;
  console.error("HARNESS ERROR", error);
} finally {
  try {
    if (userId) {
      await prisma.taskAttempt.deleteMany({ where: { userId } });
      await prisma.conceptMastery.deleteMany({ where: { userId } });
      await prisma.rewardEvent.deleteMany({ where: { userId } });
    }
    await prisma.parentalConsent.deleteMany({ where: { clerkId } });
    await prisma.consentVerification.deleteMany({ where: { clerkId } });
    await prisma.user.deleteMany({ where: { clerkId } });
    if (lessonId) await prisma.lesson.deleteMany({ where: { id: lessonId } });
  } finally {
    await prisma.$disconnect();
  }
}

if (failed > 0) process.exitCode = 1;
else console.log("ALL CHILD-DATA LIFECYCLE ASSERTIONS PASSED");
