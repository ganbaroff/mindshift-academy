#!/usr/bin/env node
// UX-audit screenshot walkthrough. Reuses the exact local-auth-bypass recipe from
// tests/e2e/current-session-ui.mjs: `?demo=1` bypasses the Clerk page gate in
// src/proxy.ts (dev-only), x-test-bypass bypasses the Clerk API gate, and a seeded
// throwaway sqlite fixture (User + Monster + ParentalConsent + TaskAttempt rows)
// stands in for a real signed-up family. No real account, no submit-button taps.
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import net from "node:net";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SQLiteDatabase = require("better-sqlite3");
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));
const { CONSENT_VERSION } = require(join(root, "src/lib/consent-policy.ts"));

const OUT_DIR = join(root, "evidence", "walkthrough-2026-08-30-s1b");
mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const failures = [];

function freePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.unref();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      const port = typeof address === "object" && address ? address.port : null;
      socket.close(() => (port ? resolve(port) : reject(new Error("No free port"))));
    });
  });
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (c) => (output = `${output}${c}`.slice(-12000)));
    child.stderr.on("data", (c) => (output = `${output}${c}`.slice(-12000)));
    child.once("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

async function prepareDatabase(databaseUrl, env) {
  const prismaCli = join(root, "node_modules/prisma/build/index.js");
  const result = await runCommand(process.execPath, [prismaCli, "db", "push"], {
    ...env,
    DATABASE_URL: databaseUrl,
  });
  if (result.code !== 0) throw new Error(`Prisma test database failed (${result.code}): ${result.output}`);
}

const FIXTURE_MONSTER_COLOR = "#3FB37F";

function seedChildFixture(databaseUrl) {
  const db = new SQLiteDatabase(databaseUrl.replace(/^file:/, ""));
  try {
    db.prepare("INSERT OR IGNORE INTO User (id, clerkId, username) VALUES (?, ?, ?)").run(
      "monster-fixture-user",
      "test_user_id",
      "Monster Fixture"
    );
    const user = db.prepare("SELECT id FROM User WHERE clerkId = ?").get("test_user_id");
    db.prepare(
      "INSERT OR IGNORE INTO Monster (id, userId, name, emoji, color, promptUsed) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("monster-fixture", user.id, "Крепыш", "🐲", FIXTURE_MONSTER_COLOR, "e2e fixture");
    db.prepare(
      `INSERT OR IGNORE INTO ParentalConsent
         (id, clerkId, parentEmail, method, serviceConsent, externalAiConsent,
          consentVersion, verifiedAt, updatedAt)
       VALUES (?, ?, ?, 'email-plus', 1, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run("consent-fixture", "test_user_id", "e2e-parent@example.test", CONSENT_VERSION);
  } finally {
    db.close();
  }
}

function resetCrossBrowserFixture(databaseUrl) {
  const db = new SQLiteDatabase(databaseUrl.replace(/^file:/, ""));
  try {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM TaskAttempt;
      DELETE FROM RewardEvent;
      DELETE FROM SessionCost;
      DELETE FROM ConceptMastery;
      DELETE FROM User;
      PRAGMA foreign_keys = ON;
    `);
  } finally {
    db.close();
  }
}

// Marks every task PASSED for every curriculum session strictly before `stopAt`,
// so navigating to `stopAt` finds it unlocked and untouched (a session whose own
// tasks are pre-passed renders "Сессия пройдена!" instead of a live workspace).
function seedUnlockedBefore(databaseUrl, stopAt) {
  const db = new SQLiteDatabase(databaseUrl.replace(/^file:/, ""));
  try {
    const userId = "monster-fixture-user";
    const insert = db.prepare(
      "INSERT OR IGNORE INTO TaskAttempt (id, userId, concept, family, tier, pass, eventId, sessionId, taskId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const curriculum = loadCurriculum();
    for (const session of curriculum) {
      if (session.id === stopAt) break;
      for (const task of session.tasks) {
        insert.run(
          `walkthrough:${session.id}:${task.id}`,
          userId,
          session.concept,
          task.family,
          task.tier,
          1,
          `walkthrough-event:${session.id}:${task.id}`,
          session.id,
          task.id
        );
      }
    }
  } finally {
    db.close();
  }
}

async function installAcademyBrowserRoutes(context) {
  await context.route("**/api/**", async (route) => {
    await route.continue({ headers: { ...route.request().headers(), "x-test-bypass": "true" } });
  });
  await context.route(/clerk\.(accounts\.dev|com|dev)/i, async (route) => {
    const request = route.request();
    const requestUrl = request.url();
    const destination = request.headers()["sec-fetch-dest"];
    if (destination === "document" || /\/v1\/client\/handshake/i.test(requestUrl)) {
      await route.continue();
      return;
    }
    const origin = request.headers().origin || "http://127.0.0.1";
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
          "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers": request.headers()["access-control-request-headers"] || "*",
        },
        body: "",
      });
      return;
    }
    try {
      const response = await route.fetch({ maxRedirects: 0 });
      const headers = { ...response.headers() };
      headers["access-control-allow-origin"] = origin;
      headers["access-control-allow-credentials"] = "true";
      await route.fulfill({ status: response.status(), headers, body: await response.body() });
    } catch {
      await route.abort().catch(() => {});
    }
  });
}

function startServer(port, databaseUrl) {
  const nextCli = join(root, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextCli, "dev", "--webpack", "-p", String(port)], {
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
  });
  let output = "";
  let settling = null;
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next dev readiness timeout: ${output.slice(-4000)}`)), 120000);
    const consume = (chunk) => {
      output = `${output}${chunk}`.slice(-12000);
      if (/Another next dev server is already running/.test(output)) {
        clearTimeout(timeout);
        clearTimeout(settling);
        reject(new Error(`a dev server is already running in ${root}:\n${output.slice(-600)}`));
        return;
      }
      if (/Ready in/.test(output) && !settling) {
        settling = setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 750);
      }
    };
    child.stdout.on("data", consume);
    child.stderr.on("data", consume);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Next dev exited before ready (${code}): ${output}`));
    });
  });
  return { child, ready, output: () => output };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  const closed = new Promise((resolve) => child.once("close", resolve));
  child.kill("SIGTERM");
  await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 5000))]);
}

async function shot(page, name, note, opts = {}) {
  const path = join(OUT_DIR, name);
  try {
    await page.screenshot({ path, fullPage: opts.fullPage !== false });
    results.push({ file: path, note });
  } catch (error) {
    failures.push({ name, note, error: String(error) });
  }
}

async function tryClickAny(page, patterns, count = 1) {
  let clicked = 0;
  for (const pattern of patterns) {
    if (clicked >= count) break;
    const locator = page.getByRole("button", { name: pattern });
    const n = await locator.count();
    for (let i = 0; i < n && clicked < count; i += 1) {
      try {
        await locator.nth(i).click({ timeout: 3000 });
        clicked += 1;
      } catch {
        /* skip unclickable */
      }
    }
  }
  return clicked;
}

async function main() {
  const hasEnvFile = existsSync(join(root, ".env.local")) || existsSync(join(root, ".env"));
  const bootable =
    hasEnvFile ||
    (Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) &&
      Boolean(process.env.CLERK_SECRET_KEY?.trim()));
  if (!bootable) {
    console.error("BLOCKED: Clerk not configured (.env.local/.env absent, no NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY) — app cannot boot.");
    process.exit(2);
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "mindshift-walkthrough-"));
  const databasePath = join(tempRoot, "academy.db").replaceAll("\\", "/");
  const databaseUrl = `file:${databasePath}`;

  await prepareDatabase(databaseUrl, process.env);
  seedChildFixture(databaseUrl);

  const port = await freePort();
  const running = startServer(port, databaseUrl);
  const server = running.child;
  try {
    await running.ready;
  } catch (error) {
    console.error(`SERVER_START_FAILED: ${error.message}`);
    process.exit(1);
  }
  const baseUrl = `http://localhost:${port}`;
  console.log(`Server ready at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  try {
    // ---------- PUBLIC PAGES ----------
    {
      const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
      try {
        const dp = await desktop.newPage();
        await dp.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: "01-landing-desktop", error: String(e) }));
        await shot(dp, "01-landing-desktop.png", "Landing page, desktop 1280x800");

        const mp = await mobile.newPage();
        await mp.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: "02-landing-mobile", error: String(e) }));
        await shot(mp, "02-landing-mobile.png", "Landing page, mobile 375x812");

        await mp.goto(`${baseUrl}/enter-code`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: "03-enter-code-mobile", error: String(e) }));
        await shot(mp, "03-enter-code-mobile.png", "Enter-code page, mobile 375x812");

        await dp.goto(`${baseUrl}/privacy`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: "04-privacy-desktop", error: String(e) }));
        await shot(dp, "04-privacy-desktop.png", "Privacy page, desktop 1280x800");
      } finally {
        await desktop.close();
        await mobile.close();
      }
    }

    // ---------- AUTHED / DEMO-BYPASSED PAGES ----------
    {
      resetCrossBrowserFixture(databaseUrl);
      seedChildFixture(databaseUrl);
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      try {
        await installAcademyBrowserRoutes(context);
        const page = await context.newPage();

        await page.goto(`${baseUrl}/map?demo=1`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: "05-map", error: String(e) }));
        await shot(page, "05-map.png", `Map view (?demo=1). URL after nav: ${page.url()}`);

        await page.goto(`${baseUrl}/dashboard?demo=1`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: "06-dashboard", error: String(e) }));
        await shot(page, "06-dashboard.png", `Dashboard (?demo=1). URL after nav: ${page.url()}`);

        await page.goto(`${baseUrl}/onboarding?demo=1`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: "07-onboarding", error: String(e) }));
        await shot(page, "07-onboarding.png", `Onboarding (?demo=1). URL after nav: ${page.url()}`);
      } finally {
        await context.close();
      }
    }

    // ---------- SESSION TASK SURFACES ----------
    const targets = [
      { id: "w1-s1", family: "grid-draw", label: "grid-draw", interact: true },
      { id: "w2-s3", family: "sequence-world", label: "sequence-world (собраться и выйти)", interact: true },
      { id: "w3-s1", family: "rule-runner", label: "rule-runner", interact: false },
      { id: "w4-s1", family: "pattern-expand", label: "pattern-expand", interact: false },
      { id: "w5-s1", family: "claim-check", label: "claim-check", interact: false },
    ];

    let n = 8;
    for (const target of targets) {
      const prefix = String(n).padStart(2, "0");
      n += 1;
      resetCrossBrowserFixture(databaseUrl);
      seedChildFixture(databaseUrl);
      seedUnlockedBefore(databaseUrl, target.id);

      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      try {
        await installAcademyBrowserRoutes(context);
        const page = await context.newPage();
        const url = `${baseUrl}/session/${target.id}?demo=1`;
        await page.goto(url, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: `${target.id}-goto`, error: String(e) }));
        await shot(page, `${prefix}-${target.id}-initial.png`, `${target.label}: initial view of /session/${target.id}`);

        // Story-and-goal intro screen (top fix #1, WALKTHROUGH-UX-2026-08-29): shown
        // once, before the board, when a session starts fresh at task index 0. Capture
        // it under its own name before dismissing it, so it reads as a distinct screen
        // rather than folding into "-initial" or the generic fallback-click capture.
        try {
          // 15s not 5s: w1-s1 is the first /session/[id] hit of the whole run, so this
          // wait races Next dev's cold on-demand compile (same cold-vs-warm chunk gap
          // MonsterAvatar.tsx's fixed-size wrapper comment documents for w1-s1 vs w2-s3).
          const introCta = page.getByTestId("session-intro-start");
          await introCta.waitFor({ timeout: 15000 });
          await shot(page, `${prefix}-${target.id}-intro.png`, `${target.label}: session intro (story + goal) before the board`);
          await introCta.click({ timeout: 3000 });
        } catch {
          // No intro this run (already resumed past it, or not present) — the
          // workspace-wait/fallback-click logic below still handles that case.
        }

        const workspace = page.getByTestId(`task-workspace-${target.family}`);
        let workspaceReady = false;
        try {
          await workspace.waitFor({ timeout: 45000 });
          workspaceReady = true;
        } catch {
          // Not the "intro screen" flow the task anticipated — this app's /session
          // routes render the task workspace directly (confirmed by reading
          // tests/e2e/current-session-ui.mjs). Try a generic CTA click as a fallback,
          // screenshotting whatever state results either way.
          const advanced = await tryClickAny(page, [/Дальше/i, /Начать/i, /Продолжить/i], 1);
          await shot(page, `${prefix}-${target.id}-intermediate.png`, `${target.label}: after attempting a primary-CTA click (advanced=${advanced})`);
          try {
            await workspace.waitFor({ timeout: 20000 });
            workspaceReady = true;
          } catch (error) {
            failures.push({ name: `${target.id}-workspace`, error: `workspace never rendered: ${error.message}; url=${page.url()}` });
          }
        }

        if (workspaceReady && target.interact) {
          if (target.family === "grid-draw") {
            // Cell aria-label changed from "Выбрать клетку N,M" to "Ряд N, колонка M"
            // (coordinate text moved off the visible cell face into the accessible name only).
            const cellButtons = page.getByRole("button", { name: /^Ряд \d+, колонка \d+/ });
            const total = await cellButtons.count();
            for (let i = 0; i < Math.min(3, total); i += 1) {
              await cellButtons.nth(i).click().catch(() => {});
            }
          } else if (target.family === "sequence-world") {
            // Chips now disable themselves after being added: aria-label flips from
            // "Добавить действие: X" to "Действие уже добавлено: X" and the button gets
            // disabled=true. Re-querying nth(0) each loop naturally skips used chips
            // since they drop out of the "^Добавить действие" match, so 3 iterations
            // add 3 DIFFERENT steps.
            const addButtons = page.getByRole("button", { name: /^Добавить действие/ });
            const total = await addButtons.count();
            for (let i = 0; i < Math.min(3, total); i += 1) {
              await addButtons.nth(0).click().catch(() => {}); // re-query index 0 each time; list may grow at end
            }
            // Remove control is now a real button (X icon + "Убрать" text) with
            // aria-label "Убрать шаг N: <label>" — substring match still finds it.
            await page.getByRole("button", { name: "Убрать", exact: false }).first().click({ timeout: 3000 }).catch(() => {});
          }
          await shot(page, `${prefix}-${target.id}-interacted.png`, `${target.label}: after local interaction (no submit)`);
        } else if (workspaceReady) {
          await shot(page, `${prefix}-${target.id}-workspace.png`, `${target.label}: task workspace rendered`);
        }
      } finally {
        await context.close();
      }

      // Fresh mobile view of the same task (separate context; state not preserved from
      // the desktop interaction above, but per-instruction this only needs the task view).
      resetCrossBrowserFixture(databaseUrl);
      seedChildFixture(databaseUrl);
      seedUnlockedBefore(databaseUrl, target.id);
      const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
      try {
        await installAcademyBrowserRoutes(mobileContext);
        const mp = await mobileContext.newPage();
        await mp.goto(`${baseUrl}/session/${target.id}?demo=1`, { waitUntil: "domcontentloaded" }).catch((e) => failures.push({ name: `${target.id}-mobile-goto`, error: String(e) }));

        // Same intro-screen handling as the desktop pass above, mobile viewport.
        try {
          const introCtaMobile = mp.getByTestId("session-intro-start");
          await introCtaMobile.waitFor({ timeout: 15000 });
          await shot(mp, `${prefix}-${target.id}-mobile-intro.png`, `${target.label}: session intro (story + goal), mobile 375px`);
          await introCtaMobile.click({ timeout: 3000 });
        } catch {
          // No intro this run — fall through to the workspace wait below.
        }

        let mobileWorkspaceReady = false;
        try {
          await mp.getByTestId(`task-workspace-${target.family}`).waitFor({ timeout: 45000 });
          mobileWorkspaceReady = true;
        } catch (error) {
          failures.push({ name: `${target.id}-mobile-workspace`, error: `mobile workspace never rendered: ${error.message}` });
        }
        await shot(mp, `${prefix}-${target.id}-mobile.png`, `${target.label}: mobile 375px view`);

        // FIX D (mobile sticky-bar occlusion) settle-proof: two real 375px VIEWPORT
        // screenshots (fullPage:false), not the fullPage capture above, so what's
        // actually behind the sticky "Проверить" bar is visible exactly as a phone
        // shows it — one with the board/list scrolled fully into view, one scrolled to
        // the literal bottom of the page so the sticky bar and the last row are both
        // on-screen at once.
        if (mobileWorkspaceReady && (target.id === "w1-s1" || target.id === "w2-s3")) {
          try {
            await mp.getByTestId(`task-workspace-${target.family}`).scrollIntoViewIfNeeded({ timeout: 5000 });
          } catch (error) {
            failures.push({ name: `${target.id}-mobile-viewport-scroll`, error: String(error) });
          }
          await mp.waitForTimeout(150);
          await shot(
            mp,
            `${prefix}-${target.id}-mobile-viewport.png`,
            `${target.label}: mobile 375px VIEWPORT (not fullPage), board/list scrolled into view`,
            { fullPage: false }
          );

          try {
            await mp.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          } catch (error) {
            failures.push({ name: `${target.id}-mobile-viewport-bottom-scroll`, error: String(error) });
          }
          await mp.waitForTimeout(150);
          await shot(
            mp,
            `${prefix}-${target.id}-mobile-viewport-bottom.png`,
            `${target.label}: mobile 375px VIEWPORT (not fullPage), scrolled to page bottom — sticky bar + last row both on-screen`,
            { fullPage: false }
          );
        }
      } finally {
        await mobileContext.close();
      }
    }
  } finally {
    await browser.close();
    await stopServer(server);
  }

  writeFileSync(
    join(OUT_DIR, "manifest.json"),
    JSON.stringify({ results, failures }, null, 2),
    "utf8"
  );
  console.log("---- SCREENSHOTS ----");
  for (const r of results) console.log(`${r.file} :: ${r.note}`);
  console.log("---- FAILURES ----");
  for (const f of failures) console.log(`${f.name} :: ${f.error}`);
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
