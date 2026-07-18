// REAL dev.db integration test for the anti-double-award fix.
// Imports the ACTUAL updateUserRewards from src/lib/rewards.ts (not a mock) and
// exercises it against the local SQLite dev.db (TURSO_* unset => prisma.ts falls
// back to file:./dev.db). Run:
//   node --import ./scripts/alias-register.mjs scripts/test-rewards.ts [runSuffix]
import { updateUserRewards } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";

// Per-run unique suffix (avoid Math.random per harness rules): argv or timestamp.
const SUFFIX =
  process.argv[2] || `${Date.now()}-${process.pid}`;

const results: { name: string; pass: boolean; detail: string }[] = [];
function assert(name: string, cond: boolean, detail: string) {
  results.push({ name, pass: cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name} :: ${detail}`);
}

const createdUserIds: string[] = [];

async function makeUser(tag: string, activeStep: number): Promise<string> {
  const u = await prisma.user.create({
    data: {
      clerkId: `test_${tag}_${SUFFIX}`,
      username: `test_${tag}_${SUFFIX}`,
      xp: 0,
      crystals: 0,
      activeStep,
    },
    select: { id: true },
  });
  createdUserIds.push(u.id);
  return u.id;
}

async function dbXp(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });
  return u?.xp ?? -1;
}

async function main() {
  console.log(`\n=== anti-double-award dev.db integration test (suffix=${SUFFIX}) ===\n`);

  // (a) DISTINCT-eventId, SAME step 1 — the core bug. Both pass the upstream
  // gate before activeStep advances; GUARD 2 (LessonProgress unique) must block #2.
  {
    const u = await makeUser("a_distinct_same_step", 1);
    const r1 = await updateUserRewards(u, 1, `evtA-${SUFFIX}`);
    const r2 = await updateUserRewards(u, 1, `evtB-${SUFFIX}`);
    const xp = await dbXp(u);
    assert(
      "(a) first award true, xp=100",
      r1.awarded === true && r1.xp === 100,
      `r1=${JSON.stringify(r1)}`
    );
    assert(
      "(a) second DISTINCT-eventId award false (GUARD 2 blocks)",
      r2.awarded === false,
      `r2=${JSON.stringify(r2)}`
    );
    assert(
      "(a) DB xp EXACTLY 100 (not 200 / no double)",
      xp === 100,
      `db.xp=${xp}`
    );
  }

  // (b) LESSON 5 — nextStep stays 5, so activeStep never advances. A naive
  // activeStep-CAS would MISS this; the LessonProgress guard still catches it.
  {
    const u = await makeUser("b_lesson5", 5);
    const r1 = await updateUserRewards(u, 5, `l5e1-${SUFFIX}`);
    const r2 = await updateUserRewards(u, 5, `l5e2-${SUFFIX}`);
    const xp = await dbXp(u);
    assert(
      "(b) lesson5 first award true, xp=500",
      r1.awarded === true && r1.xp === 500,
      `r1=${JSON.stringify(r1)}`
    );
    assert(
      "(b) lesson5 second DISTINCT-eventId award false",
      r2.awarded === false,
      `r2=${JSON.stringify(r2)}`
    );
    assert(
      "(b) lesson5 DB xp EXACTLY 500 (once, not 1000)",
      xp === 500,
      `db.xp=${xp}`
    );
  }

  // (c) SAME-eventId retry (GUARD 1 idempotency) — step 2 twice with same id.
  {
    const u = await makeUser("c_same_eventid", 2);
    const r1 = await updateUserRewards(u, 2, `same-${SUFFIX}`);
    const r2 = await updateUserRewards(u, 2, `same-${SUFFIX}`);
    const xp = await dbXp(u);
    assert(
      "(c) same-eventId first award true, xp=150",
      r1.awarded === true && r1.xp === 150,
      `r1=${JSON.stringify(r1)}`
    );
    assert(
      "(c) same-eventId retry award false (GUARD 1 blocks)",
      r2.awarded === false,
      `r2=${JSON.stringify(r2)}`
    );
    assert(
      "(c) DB xp EXACTLY 150 (single award)",
      xp === 150,
      `db.xp=${xp}`
    );
  }

  // (d) DISTINCT steps must BOTH award — the fix must not false-block legit
  // progression. step1 (100) then step2 (150) => 250.
  {
    const u = await makeUser("d_distinct_steps", 1);
    const r1 = await updateUserRewards(u, 1, `d1-${SUFFIX}`);
    const r2 = await updateUserRewards(u, 2, `d2-${SUFFIX}`);
    const xp = await dbXp(u);
    assert(
      "(d) step1 awarded true",
      r1.awarded === true && r1.xp === 100,
      `r1=${JSON.stringify(r1)}`
    );
    assert(
      "(d) step2 awarded true (no false-block)",
      r2.awarded === true && r2.xp === 250,
      `r2=${JSON.stringify(r2)}`
    );
    assert(
      "(d) DB xp EXACTLY 250 (both legit steps)",
      xp === 250,
      `db.xp=${xp}`
    );
  }
}

async function cleanup() {
  // RewardEvent has no FK cascade -> delete by userId first. LessonProgress
  // cascade-deletes with the User. Shared Lesson seed rows are left intact.
  for (const uid of createdUserIds) {
    try {
      await prisma.rewardEvent.deleteMany({ where: { userId: uid } });
      await prisma.user.delete({ where: { id: uid } });
    } catch (e) {
      console.warn(`cleanup warn for ${uid}:`, (e as Error).message);
    }
  }
}

main()
  .catch((e) => {
    console.error("TEST HARNESS ERROR:", e);
    results.push({ name: "harness", pass: false, detail: String(e) });
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    const failed = results.filter((r) => !r.pass);
    console.log(
      `\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`
    );
    if (failed.length) {
      console.log("FAILURES:", failed.map((f) => f.name).join("; "));
      process.exitCode = 1;
    } else {
      console.log("ALL ASSERTIONS PASSED — double-award is blocked, legit progress is not.");
    }
  });
