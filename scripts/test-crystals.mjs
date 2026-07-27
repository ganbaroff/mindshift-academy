#!/usr/bin/env node
/** Crystal spend/earn idempotency against local prisma. */
import { register } from "node:module";
register("./alias-loader.mjs", import.meta.url);

const { prisma } = await import("@/lib/prisma");
const {
  ensureStarterCrystals,
  spendCrystalsForHint,
  awardTaskPassCrystals,
  HINT_CRYSTAL_COST,
  STARTER_CRYSTALS,
} = await import("@/lib/tasks/crystals");

const suffix = `${Date.now()}_${process.pid}`;
const clerkId = `crystal_test_${suffix}`;
let failed = 0;

function check(name, cond, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed += 1;
}

try {
  const user = await prisma.user.create({
    data: {
      clerkId,
      username: `crystal_${suffix}`,
      xp: 0,
      crystals: 0,
      streak: 0,
      activeStep: 1,
    },
  });

  const afterStarter = await ensureStarterCrystals(user.id);
  check("starter grants crystals", afterStarter === STARTER_CRYSTALS, `got=${afterStarter}`);
  const afterStarter2 = await ensureStarterCrystals(user.id);
  check("starter is idempotent", afterStarter2 === STARTER_CRYSTALS);

  const spend1 = await spendCrystalsForHint({
    userId: user.id,
    sessionId: "w1-s1",
    taskId: "w1s1-p2",
  });
  check("spend hint ok", spend1.ok === true && spend1.alreadyOwned === false);
  check(
    "balance after spend",
    spend1.ok && spend1.crystals === STARTER_CRYSTALS - HINT_CRYSTAL_COST,
    `crystals=${spend1.ok ? spend1.crystals : "?"}`
  );

  const spend2 = await spendCrystalsForHint({
    userId: user.id,
    sessionId: "w1-s1",
    taskId: "w1s1-p2",
  });
  check("replay spend free", spend2.ok === true && spend2.alreadyOwned === true);
  check(
    "replay does not double-charge",
    spend2.ok && spend2.crystals === STARTER_CRYSTALS - HINT_CRYSTAL_COST
  );

  const award1 = await awardTaskPassCrystals({
    userId: user.id,
    sessionId: "w1-s1",
    taskId: "w1s1-p2",
  });
  check("pass awards crystals", award1.awarded === true);
  const award2 = await awardTaskPassCrystals({
    userId: user.id,
    sessionId: "w1-s1",
    taskId: "w1s1-p2",
  });
  check("pass award idempotent", award2.awarded === false && award2.crystals === award1.crystals);
} catch (e) {
  failed += 1;
  console.error("HARNESS ERROR", e);
} finally {
  const u = await prisma.user.findUnique({ where: { clerkId } });
  if (u) {
    await prisma.rewardEvent.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }
  await prisma.$disconnect();
}

if (failed) process.exitCode = 1;
else console.log("ALL CRYSTAL ASSERTIONS PASSED");
