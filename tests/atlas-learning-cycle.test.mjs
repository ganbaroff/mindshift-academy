#!/usr/bin/env node
/**
 * Atlas ↔ VOLAURA Sprint 3 cycle test.
 *
 * Lanes:
 *   1. Pure (always): sigmoid fixture mapping + mastery math
 *   2. Live HTTP (when ATLAS_LEARNING_API_URL set): full decide → lesson → outcome
 *   3. Live file (when ATLAS_CLI_JS set, no API URL): legacy file exchange
 *
 * Usage (HTTP — preferred):
 *   ATLAS_LEARNING_API_URL=http://127.0.0.1:8080 \
 *   ATLAS_LEARNING_API_KEY=test-key \
 *   npm run test:atlas-learning
 */
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";

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

async function waitForHealth(url, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/health`);
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
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

const apiUrl = process.env.ATLAS_LEARNING_API_URL;
const cliJs = process.env.ATLAS_CLI_JS;
const useHttp = Boolean(apiUrl);
const useFile = !useHttp && Boolean(cliJs) && existsSync(cliJs);

let atlasServerProc = null;
let exchangeDir = null;

if (!useHttp && !useFile) {
  console.log("\n=== Atlas learning — live lane SKIPPED (set ATLAS_LEARNING_API_URL or ATLAS_CLI_JS) ===");
} else {
  const laneLabel = useHttp ? "HTTP" : "file exchange";
  console.log(`\n=== Atlas learning — live lane (${laneLabel}) ===`);

  if (useHttp) {
    process.env.ATLAS_LEARNING_API_KEY =
      process.env.ATLAS_LEARNING_API_KEY ?? "test-learning-key";
  } else {
    exchangeDir = mkdtempSync(join(tmpdir(), "volaura-atlas-xchg-"));
    process.env.ATLAS_LEARNING_EXCHANGE_DIR = exchangeDir;
  }

  process.env.DATABASE_URL = process.env.DATABASE_URL ?? `file:${join(root, "dev-atlas-e2e.db")}`;

  try {
    if (useHttp && process.env.ATLAS_LEARNING_START_SERVER === "1") {
      const atlasRoot = process.env.ATLAS_REPO_ROOT;
      const learningApiJs = process.env.ATLAS_LEARNING_API_JS;
      if (!atlasRoot || !learningApiJs) {
        check("Atlas server bootstrap env", false, "set ATLAS_REPO_ROOT + ATLAS_LEARNING_API_JS");
      } else {
        atlasServerProc = spawn(process.execPath, [learningApiJs], {
          cwd: atlasRoot,
          env: {
            ...process.env,
            PORT: process.env.ATLAS_LEARNING_PORT ?? "8089",
            ATLAS_LEARNING_API_KEY: process.env.ATLAS_LEARNING_API_KEY,
            ATLAS_LEARNING_STATE_DIR: mkdtempSync(join(tmpdir(), "atlas-http-state-")),
          },
          stdio: "inherit",
        });
        const port = process.env.ATLAS_LEARNING_PORT ?? "8089";
        process.env.ATLAS_LEARNING_API_URL = `http://127.0.0.1:${port}`;
        const healthy = await waitForHealth(process.env.ATLAS_LEARNING_API_URL);
        check("Atlas HTTP health", healthy);
      }
    } else if (useHttp) {
      const healthy = await waitForHealth(apiUrl);
      check("Atlas HTTP health", healthy);
    }

    const gen = spawnSync("npx", ["prisma", "generate"], { cwd: root, encoding: "utf8", shell: true });
    check("prisma generate", gen.status === 0, gen.stderr?.slice(0, 200));
    const push = spawnSync("npx", ["prisma", "db", "push"], {
      cwd: root,
      encoding: "utf8",
      shell: true,
    });
    check("prisma db push", push.status === 0, push.stderr?.slice(0, 200));

    const { atlasDecide, atlasOutcome } = await import("../src/lib/atlas-learning/adapter.server.ts");
    const { prisma } = await import("../src/lib/prisma.ts");

    const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const idempotencyKey = `idem_e2e_sigmoid_${runId}`;
    const username = `atlas_e2e_${runId}`;

    const user = await prisma.user.create({
      data: { username, xp: 0, crystals: 0, streak: 0, activeStep: 1 },
    });

    await prisma.conceptMastery.create({
      data: {
        userId: user.id,
        concept: SIGMOID_DECIDE_FIXTURE.concept,
        mastery: SIGMOID_DECIDE_FIXTURE.mastery,
      },
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

    if (useFile && exchangeDir) {
      const decideReceiptPath = join(exchangeDir, "receipts", `${idempotencyKey}.json`);
      check("decide receipt file exists", existsSync(decideReceiptPath));
      const decideReceiptJson = JSON.parse(readFileSync(decideReceiptPath, "utf8"));
      check("decide receipt JSON parseable", decideReceiptJson.status === "completed");
    } else {
      check("decide audit claim id", Boolean(decide.receipt.evidenceClaimId));
    }

    const outcome = await atlasOutcome({
      userId: user.id,
      learnerId: "123",
      idempotencyKey,
      correct: true,
    });

    check("outcome receipt completed", outcome.receipt.status === "completed");
    check("mastery changed in VOLAURA", outcome.masteryAfter > outcome.masteryBefore);
    check(
      "mastery after matches formula",
      outcome.masteryAfter === masteryAfterOutcome(outcome.masteryBefore, true),
    );

    if (useFile && exchangeDir) {
      const outcomeReceiptPath = join(exchangeDir, "receipts", `${idempotencyKey}_outcome.json`);
      check("outcome receipt file exists", existsSync(outcomeReceiptPath));
    } else {
      check("outcome audit claim id", Boolean(outcome.receipt.evidenceClaimId));
    }

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
      console.log(JSON.stringify(decide.receipt, null, 2));
      console.log("\n--- outcome receipt JSON ---");
      console.log(JSON.stringify(outcome.receipt, null, 2));
    }
  } finally {
    if (atlasServerProc) {
      atlasServerProc.kill("SIGTERM");
    }
    if (exchangeDir) {
      rmSync(exchangeDir, { recursive: true, force: true });
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error("Failures:", fails.join(", "));
  process.exit(1);
}
