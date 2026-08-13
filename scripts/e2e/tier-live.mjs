#!/usr/bin/env node
/**
 * Watch the tier ladder happen, in a real browser window, on this machine.
 *
 * `tests/e2e/current-session-ui.mjs` already CERTIFIES the ladder headlessly and leaves
 * screenshots behind. This script exists for the other job: letting a human sit and look at
 * the same three screens as they load. Same seam as the gate — throwaway SQLite, fake AI,
 * the dev-only `x-test-bypass` header injected per request — so it touches no real family
 * data and needs no sign-in.
 *
 *   node scripts/e2e/tier-live.mjs [--headless] [--hold 20]
 *
 * `--hold` is how many seconds each tier stays on screen. The window closes itself at the
 * end; Ctrl-C also cleans up the server and the temp database.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SQLiteDatabase = require("better-sqlite3");
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));
const { CONSENT_VERSION } = require(join(root, "src/lib/consent-policy.ts"));

const headless = process.argv.includes("--headless");
const holdIndex = process.argv.indexOf("--hold");
const holdMs = (holdIndex > -1 ? Number(process.argv[holdIndex + 1]) || 20 : 20) * 1000;

const TIERS = [
  { tier: 1, mastery: 0, says: "образец РАСКРЫТ, есть строка «Коротко»" },
  { tier: 2, mastery: 0.5, says: "образец СВЁРНУТ, напоминания нет" },
  { tier: 3, mastery: 0.9, says: "образца НЕТ вовсе, есть «Условие уровня 3»" },
];

function freePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.unref();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close(() => resolve(port));
    });
  });
}

function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (c) => { out = `${out}${c}`.slice(-8000); });
    child.stderr.on("data", (c) => { out = `${out}${c}`.slice(-8000); });
    child.once("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

function seed(databaseUrl, concept, mastery) {
  const db = new SQLiteDatabase(databaseUrl.replace(/^file:/, ""));
  try {
    const userId = "tier-live-user";
    db.prepare("INSERT OR IGNORE INTO User (id, clerkId, username) VALUES (?, ?, ?)")
      .run(userId, "test_user_id", "Tier Live");
    db.prepare(
      "INSERT OR IGNORE INTO Monster (id, userId, name, emoji, color, promptUsed) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("tier-live-monster", userId, "Крепыш", "🐲", "#3FB37F", "tier live");
    db.prepare(
      `INSERT OR IGNORE INTO ParentalConsent
         (id, clerkId, parentEmail, method, serviceConsent, externalAiConsent,
          consentVersion, verifiedAt, updatedAt)
       VALUES (?, ?, ?, 'email-plus', 1, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run("tier-live-consent", "test_user_id", "preview@example.test", CONSENT_VERSION);

    // Week 1 finished, w2-s1 untouched — otherwise the session renders «Сессия пройдена!».
    const insert = db.prepare(
      "INSERT OR IGNORE INTO TaskAttempt (id, userId, concept, family, tier, pass, eventId, sessionId, taskId) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)"
    );
    for (const session of loadCurriculum()) {
      if (session.id === "w2-s1") break;
      for (const task of session.tasks) {
        insert.run(`live:${session.id}:${task.id}`, userId, session.concept, task.family,
          task.tier, `live-event:${session.id}:${task.id}`, session.id, task.id);
      }
    }

    db.prepare("DELETE FROM ConceptMastery WHERE userId = ? AND concept = ?").run(userId, concept);
    db.prepare(
      `INSERT INTO ConceptMastery (id, userId, concept, mastery, intervalStep, updatedAt)
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`
    ).run(`live-mastery-${concept}`, userId, concept, mastery);
  } finally {
    db.close();
  }
}

const tempRoot = mkdtempSync(join(tmpdir(), "mindshift-tier-live-"));
const databaseUrl = `file:${join(tempRoot, "live.db").replaceAll("\\", "/")}`;
let server = null;
let browser = null;

async function main() {
  const session = loadCurriculum().find((item) => item.id === "w2-s1");
  console.log("[tier-live] preparing a throwaway database…");
  const prepared = await run(
    process.execPath,
    [join(root, "node_modules/prisma/build/index.js"), "db", "push"],
    { ...process.env, DATABASE_URL: databaseUrl }
  );
  if (prepared.code !== 0) throw new Error(`prisma db push failed: ${prepared.out.slice(-500)}`);

  const port = await freePort();
  console.log(`[tier-live] starting next dev on ${port}…`);
  server = spawn(
    process.execPath,
    [join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", String(port)],
    {
      cwd: root,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        TURSO_DATABASE_URL: databaseUrl,
        TURSO_AUTH_TOKEN: "",
        FAKE_AI: "1",
        FAKE_AI_MODE: "tutor_down",
        NEXT_PUBLIC_UX_V11: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  await new Promise((resolve, reject) => {
    let out = "";
    const onData = (chunk) => {
      out = `${out}${chunk}`.slice(-6000);
      if (/Ready in|started server on|Local:/i.test(out)) resolve();
    };
    server.stdout.on("data", onData);
    server.stderr.on("data", onData);
    server.once("close", (code) => reject(new Error(`next dev exited (${code}): ${out.slice(-400)}`)));
    setTimeout(() => resolve(), 45000);
  });

  const baseUrl = `http://localhost:${port}`;
  browser = await chromium.launch({ headless, slowMo: headless ? 0 : 120 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // The dev-only seam the gate uses. Scoped to Academy API calls, never to Clerk.
  await context.route("**/api/**", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-test-bypass": "true" } })
  );
  const page = await context.newPage();

  for (const step of TIERS) {
    seed(databaseUrl, session.concept, step.mastery);
    console.log(`\n[tier-live] mastery ${step.mastery} → уровень ${step.tier}: ${step.says}`);
    await page.goto(`${baseUrl}/session/w2-s1?demo=1`, { waitUntil: "domcontentloaded" });
    const workspace = page.getByTestId("task-workspace-sequence-world");
    try {
      await workspace.waitFor({ timeout: 45000 });
    } catch {
      await page.reload({ waitUntil: "domcontentloaded" });
      await workspace.waitFor({ timeout: 45000 });
    }
    const shownTier = await workspace.getAttribute("data-tier");
    const example = await workspace.getAttribute("data-worked-example");
    const demands = await page.getByTestId("task-tier-demand").count();
    const reminders = await page.getByTestId("task-tier-reminder").count();
    console.log(
      `[tier-live] на экране: data-tier=${shownTier} worked-example=${example} ` +
        `напоминаний=${reminders} условий=${demands}`
    );
    if (String(step.tier) !== shownTier) {
      throw new Error(`ожидался уровень ${step.tier}, на экране ${shownTier}`);
    }
    await page.waitForTimeout(holdMs);
  }
  console.log("\n[tier-live] всё показано, закрываю окно.");
}

async function cleanup() {
  try { if (browser) await browser.close(); } catch {}
  try { if (server && server.exitCode === null) server.kill(); } catch {}
  try { rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}

process.once("SIGINT", async () => { await cleanup(); process.exit(130); });

try {
  await main();
  await cleanup();
  process.exit(0);
} catch (error) {
  console.error(`[tier-live] ${error instanceof Error ? error.message : String(error)}`);
  await cleanup();
  process.exit(1);
}
