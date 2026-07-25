#!/usr/bin/env node
/**
 * Atlas ↔ VOLAURA Sprint 2 cycle test.
 *
 * Lanes:
 *   1. Pure (always): sigmoid fixture mapping + mastery math
 *   2. Live (when ATLAS_CLI_JS set): full decide → lesson → outcome via adapter + Atlas CLI
 *
 * Usage:
 *   ATLAS_LEARNING_EXCHANGE_DIR=/tmp/atlas-xchg \
 *   ATLAS_CLI_JS=/path/to/atlas-cli/dist/cli.js \
 *   node tests/atlas-learning-cycle.test.mjs
 */
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

let pass = 0;
let fail = 0;
const fails = [];

function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    fails.push(name);
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

console.log("=== Atlas learning — pure lane ===");
const { SIGMOID_DECIDE_FIXTURE } = await import("../src/lib/atlas-learning/contracts.ts");
const { mapActionToSigmoidLesson, renderSigmoidLessonHtml } = await import(
  "../src/lib/atlas-learning/sigmoid-lesson.ts"
);
const { masteryAfterOutcome } = await import("../src/lib/atlas-learning/mastery.ts");

check("sigmoid fixture mastery", SIGMOID_DECIDE_FIXTURE.mastery === 0.35);
check(
  "sigmoid fixture answers",
  JSON.stringify(SIGMOID_DECIDE_FIXTURE.lastAnswers) === JSON.stringify([false, true, false]),
);
check("sigmoid fixture responseTime", SIGMOID_DECIDE_FIXTURE.responseTimeSec === 28);
check("sigmoid fixture energy", SIGMOID_DECIDE_FIXTURE.energy === "medium");

const visual = mapActionToSigmoidLesson("VISUAL_EXPLANATION");
check("VISUAL_EXPLANATION → sigmoid-visual", visual.format === "sigmoid-visual");
const grill = mapActionToSigmoidLesson("GRILL_ME");
check("GRILL_ME → sigmoid-grill", grill.format === "sigmoid-grill");
const flash = mapActionToSigmoidLesson("FLASHCARDS");
check("FLASHCARDS → sigmoid-flashcards", flash.format === "sigmoid-flashcards");

const html = renderSigmoidLessonHtml(visual);
check("lesson html render marker", html.includes("data-lesson-format=sigmoid-visual"));
check("mastery increases on correct", masteryAfterOutcome(0.35, true) === 0.5);
check("mastery decreases on wrong", masteryAfterOutcome(0.35, false) === 0.3);

const cliJs = process.env.ATLAS_CLI_JS;
if (!cliJs) {
  console.log("\n=== Atlas learning — live lane SKIPPED (set ATLAS_CLI_JS) ===");
} else if (!existsSync(cliJs)) {
  console.log(`\n=== Atlas learning — live lane SKIPPED (missing ${cliJs}) ===`);
} else {
  console.log("\n=== Atlas learning — live lane (Atlas CLI) ===");

  const exchangeDir = mkdtempSync(join(tmpdir(), "volaura-atlas-xchg-"));
  process.env.ATLAS_LEARNING_EXCHANGE_DIR = exchangeDir;
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? `file:${join(root, "dev-atlas-e2e.db")}`;

  try {
    const gen = spawnSync("npx", ["prisma", "generate"], { cwd: root, encoding: "utf8", shell: true });
    check("prisma generate", gen.status === 0, gen.stderr?.slice(0, 200));
    const push = spawnSync("npx", ["prisma", "db", "push"], {
      cwd: root,
      encoding: "utf8",
      shell: true,
    });
    check("prisma db push", push.status === 0, push.stderr?.slice(0, 200));

    const { atlasDecide, atlasOutcome } = await import("../src/lib/atlas-learning/adapter.server.ts");

    const idempotencyKey = `idem_e2e_sigmoid_${Date.now()}`;
    const user = await (await import("../src/lib/prisma.ts")).prisma.user.upsert({
      where: { username: "atlas_e2e_user" },
      update: {},
      create: { username: "atlas_e2e_user", xp: 0, crystals: 0, streak: 0, activeStep: 1 },
    });

    const decide = await atlasDecide({
      userId: user.id,
      learnerId: "123",
      idempotencyKey,
      input: SIGMOID_DECIDE_FIXTURE,
    });

    check("decide receipt completed", decide.receipt.status === "completed");
    check("decide action VISUAL_EXPLANATION", decide.receipt.decision?.action === "VISUAL_EXPLANATION");
    check("decide decisionScore 0.78", decide.receipt.decision?.decisionScore === 0.78);
    check("decisionId stored", Boolean(decide.receipt.decisionId));
    check("goalId stored", Boolean(decide.receipt.goalId));
    check("lesson rendered", decide.lessonHtml.includes("data-lesson-format=sigmoid-visual"));

    const decideReceiptPath = join(exchangeDir, "receipts", `${idempotencyKey}.json`);
    check("decide receipt file exists", existsSync(decideReceiptPath));
    const decideReceiptJson = JSON.parse(readFileSync(decideReceiptPath, "utf8"));
    check("decide receipt JSON parseable", decideReceiptJson.status === "completed");

    const outcome = await atlasOutcome({
      userId: user.id,
      learnerId: "123",
      idempotencyKey,
      correct: true,
    });

    check("outcome receipt completed", outcome.receipt.status === "completed");
    check("mastery changed in VOLAURA", outcome.masteryAfter > outcome.masteryBefore);
    check("mastery after correct answer", outcome.masteryAfter === 0.5);

    const outcomeReceiptPath = join(exchangeDir, "receipts", `${idempotencyKey}_outcome.json`);
    check("outcome receipt file exists", existsSync(outcomeReceiptPath));

    const repeat = await atlasDecide({
      userId: user.id,
      learnerId: "123",
      idempotencyKey,
      input: SIGMOID_DECIDE_FIXTURE,
    });
    check(
      "repeat decide same decisionId",
      repeat.receipt.decisionId === decide.receipt.decisionId,
    );

    if (decide.receipt.decisionId) {
      console.log("\n--- decide receipt JSON ---");
      console.log(JSON.stringify(decideReceiptJson, null, 2));
      console.log("\n--- outcome receipt JSON ---");
      console.log(JSON.stringify(JSON.parse(readFileSync(outcomeReceiptPath, "utf8")), null, 2));
    }
  } finally {
    rmSync(exchangeDir, { recursive: true, force: true });
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("Failures:", fails.join(", "));
  process.exit(1);
}
