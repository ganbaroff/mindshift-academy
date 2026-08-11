#!/usr/bin/env node
/**
 * `/map`, on its own gate.
 *
 * Two reasons this is a separate script rather than three more assertions inside
 * `current-session-ui.mjs`:
 *
 *  1. **The map has never been verifiable.** It is a server component that asks Clerk
 *     directly, so until the dev-only seam in `getViewerAccess` there was no way for any
 *     automated run to render it. It shipped, lived in production and was redesigned with
 *     a founder's screenshot as the only evidence it worked.
 *  2. **Its states are data, not a journey.** The big suite reaches a late-course map by
 *     driving 81 tasks through a browser, which takes minutes and — as of 2026-08-11 —
 *     intermittently dies at w2-s1. A page whose entire input is "which sessions are
 *     complete" should be checked by writing that fact into the database, not by playing
 *     the course. Seconds instead of minutes, and no shared failure mode.
 *
 * Everything here is throwaway: its own temp SQLite file, its own dev server, its own
 * port. It writes nothing into the repo except screenshots under `evidence/map/`.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const root = process.cwd();
const SQLiteDatabase = require("better-sqlite3");
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));
const { CONSENT_VERSION } = require(join(root, "src/lib/consent-policy.ts"));
const { COURSE_WEEKS } = require(join(root, "src/lib/tasks/course-map.ts"));

const CLERK_ID = "test_user_id";
const USER_ID = "map-fixture-user";
const MONSTER_COLOR = "#3FB37F"; // a real species colour, not the game store's default
const MONSTER_NAME = "Крепыш";

const outDir = join(root, "evidence", "map");
mkdirSync(outDir, { recursive: true });

const dbDir = mkdtempSync(join(tmpdir(), "map-"));
const dbPath = join(dbDir, "map.db").replaceAll("\\", "/");
const dbUrl = `file:${dbPath}`;
const env = { ...process.env, DATABASE_URL: dbUrl, TURSO_DATABASE_URL: dbUrl, FAKE_AI: "1" };

const port = await new Promise((resolve) => {
  const probe = net.createServer();
  probe.listen(0, () => {
    const { port: free } = probe.address();
    probe.close(() => resolve(free));
  });
});

await run(process.execPath, [join(root, "node_modules/prisma/build/index.js"), "db", "push"]);
seedChild();

const server = spawn(
  process.execPath,
  [join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", String(port)],
  { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] }
);
let serverOutput = "";
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`ready timeout: ${serverOutput.slice(-600)}`)), 120000);
  const onData = (chunk) => {
    serverOutput += chunk;
    if (/Ready in/.test(serverOutput)) {
      clearTimeout(timer);
      resolve();
    }
  };
  server.stdout.on("data", onData);
  server.stderr.on("data", onData);
});

const base = `http://localhost:${port}`;
const browser = await chromium.launch({ headless: true });
let checks = 0;

try {
  // A child at the very beginning: nothing done, nothing grown, one thing to do.
  await inspect("start", async ({ body, page }) => {
    const cont = page.getByTestId("map-continue");
    await cont.waitFor({ timeout: 30000 });
    const box = await cont.boundingBox();
    ok(box.height >= 44, `the continue control is ${Math.round(box.height)}px tall, floor is 44`);
    ok(/Продолжить/.test(await cont.innerText()), "the continue control names its action");
    ok(/неделя 1 · сессия 1/.test(await cont.innerText()), "it says exactly where it goes");
    ok(new URL(await cont.getAttribute("href"), base).pathname === "/session/w1-s1", "and it goes there");
    ok(body.includes(MONSTER_NAME), "the monster is named");
    ok(/сессия 1 — сейчас/.test(body), "the current stop says it is current");
    ok(/сессия 2 — потом/.test(body), "a stop that is not open says what it is, not «·»");
    ok(/дальше ещё 4 недели/.test(body), "what is ahead is a sentence, not decorative dots");
    ok(!/выросли уши/.test(body), "nothing is claimed as grown before week 1 is finished");
  });

  // Mid-course: two weeks behind, week three open. The state a real pilot child spends
  // most of their time in, and the only one that exercises the trail.
  seedCompletedSessions(2);
  await inspect("midway", async ({ body, page }) => {
    await page.getByTestId("map-continue").waitFor({ timeout: 30000 });
    ok(/выросли уши/.test(body), "week 1's part is on the trail");
    ok(/выросли руки/.test(body), "week 2's part is on the trail");
    ok(/неделя 3 · Правило/.test(body), "week 3 is the open cluster");
    ok(!/вырос рог/.test(body), "week 3's part is promised, not claimed");
    ok(/отрастит: рог/.test(body), "and it IS promised");
    ok(/дальше ещё 2 недели/.test(body), "what remains is counted honestly");
  });

  // The end of the course. Nothing left to continue, and the page must not pretend
  // otherwise by leaving a dead button on screen.
  seedCompletedSessions(5);
  await inspect("finished", async ({ body, page }) => {
    await page.getByText("Все пять недель пройдены").waitFor({ timeout: 30000 });
    ok(await page.getByTestId("map-continue").count() === 0, "a finished child has nothing to continue");
    for (const week of COURSE_WEEKS) {
      ok(body.includes(week.partGrownRu), `the trail keeps week ${week.week}: ${week.partGrownRu}`);
    }
    ok(!/дальше ещё/.test(body), "nothing is ahead, so nothing claims to be");
  });

  console.log(`\nMAP UI: all passed (${checks} checks)\n`);
} catch (error) {
  // A failing gate has to say what the server was doing, or the next person debugs the
  // browser for an hour over a process that died at boot.
  console.error(`\nMAP UI FAILED: ${error.message}\n--- dev server tail ---\n${serverOutput.slice(-1500)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill("SIGTERM");
}

/** Renders /map at both sizes, runs the caller's assertions, and keeps a frame of each. */
async function inspect(phase, assertions) {
  for (const [device, viewport] of [
    ["desktop", { width: 1280, height: 900 }],
    ["mobile-320", { width: 320, height: 780 }],
  ]) {
    const context = await browser.newContext({ viewport });
    try {
      // Scoped to the map document only: Clerk's own endpoints must never see this header.
      await context.route("**/map", async (route) => {
        await route.continue({ headers: { ...route.request().headers(), "x-test-bypass": "true" } });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      const response = await page.goto(`${base}/map`, { waitUntil: "domcontentloaded" });
      ok(response.status() === 200, `${phase}/${device}: /map answers 200`);
      ok(new URL(page.url()).pathname === "/map", `${phase}/${device}: renders instead of redirecting`);
      await page.locator("main svg[role=img]").first().waitFor({ timeout: 30000 });
      const body = await page.locator("main").innerText();
      await assertions({ body, page });
      await page.screenshot({ path: join(outDir, `map-${phase}-${device}.png`), fullPage: true });
      assert.deepEqual(errors, [], `${phase}/${device}: console`);
    } finally {
      await context.close();
    }
  }
}

function ok(condition, label) {
  assert.ok(condition, label);
  checks += 1;
  console.log(`  PASS  ${label}`);
}

function seedChild() {
  const db = new SQLiteDatabase(dbPath);
  try {
    db.prepare("INSERT OR IGNORE INTO User (id, clerkId, username) VALUES (?, ?, ?)")
      .run(USER_ID, CLERK_ID, "Map Fixture");
    db.prepare(
      "INSERT OR IGNORE INTO Monster (id, userId, name, emoji, color, promptUsed) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("map-monster", USER_ID, MONSTER_NAME, "🐲", MONSTER_COLOR, "map fixture");
    // Consent is fail-closed: without a verified row /map redirects to /consent and this
    // gate would certify a page it never saw. CONSENT_VERSION is imported so a policy bump
    // breaks the fixture loudly instead of silently.
    db.prepare(
      `INSERT OR IGNORE INTO ParentalConsent
         (id, clerkId, parentEmail, method, serviceConsent, externalAiConsent,
          consentVersion, verifiedAt, updatedAt)
       VALUES (?, ?, ?, 'email-plus', 1, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run("map-consent", CLERK_ID, "map-parent@example.test", CONSENT_VERSION);
  } finally {
    db.close();
  }
}

/** Marks every session up to and including `throughWeek` as passed, task by task. */
function seedCompletedSessions(throughWeek) {
  const db = new SQLiteDatabase(dbPath);
  try {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO TaskAttempt
         (id, userId, concept, family, tier, pass, eventId, sessionId, taskId)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`
    );
    for (const session of loadCurriculum()) {
      if (Number(session.id.slice(1, 2)) > throughWeek) continue;
      for (const task of session.tasks) {
        insert.run(
          `map:${session.id}:${task.id}`,
          USER_ID,
          session.concept,
          task.family,
          task.tier,
          `map-event:${session.id}:${task.id}`,
          session.id,
          task.id
        );
      }
    }
  } finally {
    db.close();
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: "ignore" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${args[1]} exited ${code}`))));
  });
}
