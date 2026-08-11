import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { chromium, firefox, webkit } from "playwright";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SQLiteDatabase = require("better-sqlite3");
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));
const { hasDevTestBypass } = require(join(root, "src/lib/request-access.ts"));
const { weekClosedBy } = require(join(root, "src/lib/tasks/course-map.ts"));

const SESSION_IDS = [
  "w1-s1", "w1-s2", "w1-s3",
  "w2-s1", "w2-s2", "w2-s3",
  "w3-s1", "w3-s2", "w3-s3",
  "w4-s1", "w4-s2", "w4-s3",
  "w5-s1", "w5-s2", "w5-s3",
];

const SEQUENCE_LABELS = {
  взять_нож: "Взять нож",
  положить_хлеб: "Положить хлеб",
  намазать_масло: "Намазать масло",
  положить_сыр: "Положить сыр",
  накрыть_хлебом: "Накрыть хлебом",
  подать: "Подать",
};
const CORRECT_SEQUENCE = [
  "взять_нож",
  "положить_хлеб",
  "намазать_масло",
  "положить_сыр",
  "накрыть_хлебом",
  "подать",
];
const TILE_LABELS = { wall: "стена", open: "свободно", trap: "ловушка", goal: "цель" };

function evidenceDirectory() {
  const stamp = new Date().toISOString().replaceAll(":", "-");
  return process.env.ACADEMY_BROWSER_EVIDENCE_DIR || join(root, ".superpowers/sdd/evidence", `browser-${stamp}`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.unref();
    socket.once("error", reject);
    socket.listen(0, "127.0.0.1", () => {
      const address = socket.address();
      const port = typeof address === "object" && address ? address.port : null;
      socket.close(() => port ? resolve(port) : reject(new Error("No free port")));
    });
  });
}

function runCommand(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output = `${output}${chunk}`.slice(-12000); });
    child.stderr.on("data", (chunk) => { output = `${output}${chunk}`.slice(-12000); });
    child.once("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

async function prepareDatabase(databaseUrl, env) {
  const prismaCli = join(root, "node_modules/prisma/build/index.js");
  const result = await runCommand(
    process.execPath,
    [prismaCli, "db", "push"],
    { ...env, DATABASE_URL: databaseUrl }
  );
  if (result.code !== 0) throw new Error(`Prisma test database failed (${result.code}): ${result.output}`);
}

function seedUnlockedCapstone(databaseUrl) {
  const databasePath = databaseUrl.replace(/^file:/, "");
  const db = new SQLiteDatabase(databasePath);
  try {
    const userId = "cross-browser-fixture-user";
    db.prepare("INSERT OR IGNORE INTO User (id, clerkId, username) VALUES (?, ?, ?)")
      .run(userId, "test_user_id", "Cross Browser Fixture");
    const insert = db.prepare(
      "INSERT OR IGNORE INTO TaskAttempt (id, userId, concept, family, tier, pass, eventId, sessionId, taskId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const curriculum = loadCurriculum();
    for (const session of curriculum) {
      if (session.id === "w5-s3") break;
      for (const task of session.tasks) {
        insert.run(
          `cross-browser:${session.id}:${task.id}`,
          userId,
          session.concept,
          task.family,
          task.tier,
          1,
          `cross-browser-event:${session.id}:${task.id}`,
          session.id,
          task.id
        );
      }
    }
  } finally {
    db.close();
  }
}

/**
 * A child with no Monster row is a state production cannot reach — `/map` sends them to
 * onboarding. This suite ran without one anyway, so every screen quietly fell back to the
 * game store's default violet and nothing could catch a screen drawing a stranger's
 * monster instead of the child's. Seeding one makes that catchable.
 *
 * The colour is a real species colour, deliberately not the store default, so the
 * gradient id in the rendered SVG (`monster-grad-3FB37F`) is proof of whose monster it is.
 */
const FIXTURE_MONSTER_COLOR = "#3FB37F";

function seedMonster(databaseUrl) {
  const db = new SQLiteDatabase(databaseUrl.replace(/^file:/, ""));
  try {
    db.prepare("INSERT OR IGNORE INTO User (id, clerkId, username) VALUES (?, ?, ?)")
      .run("monster-fixture-user", "test_user_id", "Monster Fixture");
    const user = db.prepare("SELECT id FROM User WHERE clerkId = ?").get("test_user_id");
    db.prepare(
      "INSERT OR IGNORE INTO Monster (id, userId, name, emoji, color, promptUsed) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("monster-fixture", user.id, "Крепыш", "🐲", FIXTURE_MONSTER_COLOR, "e2e fixture");
  } finally {
    db.close();
  }
}

function resetCrossBrowserFixture(databaseUrl) {
  const databasePath = databaseUrl.replace(/^file:/, "");
  const db = new SQLiteDatabase(databasePath);
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
      // The gate exists to certify what a child actually meets, so it drives the v1.1
      // mechanics on regardless of the developer's shell. §7 step 6 makes this suite the
      // precondition for turning the flag on in production; a run with the flag off
      // would certify the old screen and prove nothing about the new one.
      NEXT_PUBLIC_UX_V11: "1",
      /**
       * No placeholder Clerk key here, and that was tried: a syntactically valid but
       * fake `pk_test_…` is WORSE than none. The key encodes the Clerk instance host, so
       * the middleware dutifully proxies every request to a domain that does not exist
       * and the whole app answers 404 — a failure that looks like a broken product.
       * The suite refuses to start without a real publishable key instead (see below).
       */
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Next dev readiness timeout: ${output.slice(-4000)}`)), 120000);
    const consume = (chunk) => {
      output = `${output}${chunk}`.slice(-12000);
      if (/Ready in/.test(output)) {
        clearTimeout(timeout);
        resolve();
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

async function installAcademyBrowserRoutes(context) {
  // Scope the development-only bypass to Academy API requests. Clerk's own
  // requests must not receive this header.
  await context.route("**/api/**", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), "x-test-bypass": "true" },
    });
  });

  // The headless sandbox rejects Clerk CDN/FAPI CORS preflights when the
  // provider redirects OPTIONS. Proxy through Playwright's node-side fetch and
  // re-emit same-origin CORS headers; this keeps the real ClerkProvider tree.
  await context.route(/clerk\.(accounts\.dev|com|dev)/i, async (route) => {
    const request = route.request();
    const requestUrl = request.url();
    const destination = request.headers()["sec-fetch-dest"];
    // Clerk keyless handshakes are browser-owned document navigations. If the
    // node-side proxy fulfills their redirect, WebKit can wait forever for a
    // navigation commit during reload. Let the browser preserve the redirect
    // and document origin; only proxy CORS-sensitive non-document requests.
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
      // Preserve provider redirects for the browser. Following Clerk's
      // handshake redirect in Node and fulfilling its final HTML under the
      // Clerk origin makes WebKit resolve the app's /_next assets on Clerk's
      // domain, so reload loses the session workspace.
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

function numericRule(expected) {
  if (!expected?.length || !expected.every((item) => Number.isFinite(Number(item)))) return null;
  const values = expected.map(Number);
  const step = values.length > 1 ? values[1] - values[0] : 0;
  return values.every((value, index) => value === values[0] + step * index)
    ? { start: values[0], step }
    : null;
}

function shortestCycle(expected) {
  for (let length = 1; length < expected.length; length += 1) {
    if (expected.every((item, index) => item === expected[index % length])) {
      return expected.slice(0, length);
    }
  }
  throw new Error(`No compact cycle for ${expected.join(",")}`);
}

async function driveGrid(page, task) {
  const workspace = page.getByTestId("task-workspace-grid-draw");
  if (task.role === "collision") {
    const targetKeys = new Set(task.target.map(([row, column]) => `${row}:${column}`));
    let wrong = null;
    for (let row = 0; row < 4 && !wrong; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        if (!targetKeys.has(`${row}:${column}`)) {
          wrong = [row, column];
          break;
        }
      }
    }
    assert.ok(wrong, "collision has a non-target probe cell");
    await workspace.getByRole("button", { name: `Выбрать клетку ${wrong[0] + 1}, ${wrong[1] + 1}`, exact: true }).click();
    await submitCurrentTask(page, workspace);
    // After a FAILED attempt the footer must offer both: the same Check button (answer
    // again in place) and Пропустить (give up). A single button here means the retry
    // wall is back — that regression shipped once already behind a green unit gate.
    await page.getByRole("button", { name: "Пропустить", exact: true }).waitFor();
    await page
      .locator('[data-testid="session-primary-check"]')
      .waitFor({ state: "visible" });
    await workspace.getByRole("button", { name: "Очистить поле", exact: true }).click();
  }
  for (const [row, column] of task.target) {
    await workspace.getByRole("button", { name: `Выбрать клетку ${row + 1}, ${column + 1}`, exact: true }).click();
  }
}

async function driveSequence(page) {
  const workspace = page.getByTestId("task-workspace-sequence-world");
  for (const action of CORRECT_SEQUENCE) {
    await workspace.getByRole("button", { name: `Добавить действие: ${SEQUENCE_LABELS[action]}`, exact: true }).click();
  }
}

async function driveRule(page, task) {
  const workspace = page.getByTestId("task-workspace-rule-runner");
  await workspace.getByLabel("Действие иначе, для остальных случаев").selectOption("step");
  const tiles = [...new Set(task.ruleMaps.map((map) => map.ahead))];
  for (const tile of tiles) {
    const option = tile === "wall" ? "wait" : tile === "trap" ? "stop" : "otherwise";
    await workspace.getByLabel(`Действие, если впереди ${TILE_LABELS[tile]}`).selectOption(option);
  }
}

async function drivePattern(page, task) {
  const workspace = page.getByTestId("task-workspace-pattern-expand");
  const arithmetic = numericRule(task.patternExpected);
  if (arithmetic) {
    await workspace.getByLabel("Начальное число").fill(String(arithmetic.start));
    await workspace.getByLabel("Шаг последовательности").fill(String(arithmetic.step));
    return;
  }
  await workspace.getByLabel("Короткий повторяющийся цикл", { exact: true }).check();
  await workspace.getByLabel("Элементы короткого цикла").fill(shortestCycle(task.patternExpected).join(", "));
}

async function driveClaims(page, task) {
  const workspace = page.getByTestId("task-workspace-claim-check");
  for (const claim of task.claims) {
    const fieldset = workspace.locator("fieldset").filter({ hasText: claim.text });
    await fieldset.getByLabel(claim.truth ? "Верно" : "Неверно", { exact: true }).check();
  }
}

/**
 * Submit the current task the way a child does.
 *
 * The surfaces keep their own «Проверить» in the DOM for form semantics and screen
 * readers, but the session screen passes `externalPrimaryAction`, which clips it and
 * sets `pointer-events: none` (`PRIMARY_ACTION_HIDDEN`). The button a human presses is
 * the one in the sticky footer. This suite used to click the clipped one and hang for
 * 30s against the footer intercepting the pointer — which is why the gate was never
 * wired into `verify:release`. Assert on the accessible button; click the visible one.
 */
async function submitCurrentTask(page, workspace) {
  const inWorkspace = workspace.getByRole("button", { name: "Проверить", exact: true });
  await assert.doesNotReject(() => inWorkspace.waitFor({ state: "attached" }));
  const footerCheck = page.getByTestId("session-primary-check");
  await footerCheck.waitFor({ state: "visible" });
  await footerCheck.click();
}

async function driveTask(page, task) {
  await page.getByTestId(`task-workspace-${task.family}`).waitFor();
  // The prompt line carries the task's GOAL once a session is briefed
  // (08-UX-MONSTER-JOURNEY §10.2); promptRu remains the line for sessions not yet
  // backfilled. Derived from content, not hardcoded, so backfilling the remaining
  // sessions cannot silently break this gate.
  await assert.doesNotReject(() =>
    page.getByTestId("task-prompt-caption").filter({ hasText: task.goalRu ?? task.promptRu }).waitFor()
  );
  if (task.givenRu?.length) {
    await assert.doesNotReject(() => page.getByTestId("task-given").waitFor());
  }
  if (task.doneWhenRu) {
    await assert.doesNotReject(() =>
      page.getByTestId("task-done-when").filter({ hasText: task.doneWhenRu }).first().waitFor()
    );
  }
  if (task.family === "grid-draw") await driveGrid(page, task);
  else if (task.family === "sequence-world") await driveSequence(page);
  else if (task.family === "rule-runner") await driveRule(page, task);
  else if (task.family === "pattern-expand") await drivePattern(page, task);
  else await driveClaims(page, task);
}

/**
 * The re-ask, driven as a child meets it (08-UX-MONSTER-JOURNEY §3, §10.1).
 *
 * The three properties that make it safe are the ones asserted here: it is not an
 * attempt (no verdict appears, so no Пропустить joins the bar), it lands *under* the
 * feedback area rather than replacing the workspace, and the child's own text survives
 * so a 90%-right answer is not retyped from scratch.
 */
async function assertReaskFlow(browser, baseUrl, outDir) {
  // Its own context: the drive that follows expects a session it has never opened, and
  // an exhausted page left mid-conversation is not that. Cheap insurance — this check
  // costs one navigation.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  await installAcademyBrowserRoutes(context);
  const page = await context.newPage();
  try {
  await page.goto(`${baseUrl}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 30000 });

  // The brief must be readable before the child touches anything.
  await page.getByTestId("task-given").waitFor();
  await page.getByTestId("task-done-when").waitFor();

  await page.getByText("Сказать своими словами", { exact: true }).click();
  const input = page.locator("#task-utterance");
  await input.fill("намажь");
  await page.getByRole("button", { name: "Отправить текст", exact: true }).click();

  const reask = page.getByTestId("monster-reask");
  await reask.waitFor({ timeout: 15000 });
  const asked = await reask.innerText();
  assert.ok(asked.includes("«намажь»"), `re-ask must quote the child: ${asked}`);
  // A verdict, not the word: «Это не ошибка» is the helper line and must be present.
  assert.ok(
    !/неправильно|провал|ты ошибся|ты не смог/i.test(asked),
    `re-ask must not read as a verdict: ${asked}`
  );
  assert.ok(asked.includes("Это не ошибка"), `re-ask must say it is not one: ${asked}`);

  // Not an attempt: no verdict, so the skip control never appears beside Проверить.
  assert.equal(
    await page.getByRole("button", { name: "Пропустить", exact: true }).count(),
    0,
    "a re-ask must not be recorded as a failed attempt"
  );
  // The workspace is still there and the child's words are still editable in place.
  await page.getByTestId("task-workspace-grid-draw").waitFor();
  assert.equal(await input.inputValue(), "намажь", "the child's text must stay editable");

  await page.screenshot({ path: join(outDir, "desktop-w1-s1-reask.png"), fullPage: true });

  // The pilot's feedback loop, on the screen a child is actually on. One tap, and no
  // text box anywhere — the COPPA rule is the server's, but the button must not even
  // offer typing here.
  const report = page.getByTestId("report-problem");
  await report.waitFor({ timeout: 15000 });
  await report.click();
  // Either answer is correct and both are honest: "ушло оператору" when a channel
  // carried it, "не ушло" when none is configured — which is the case on a test runner.
  // What must never happen is silence, or a claim of delivery nobody can back.
  await page
    .locator('[data-testid="report-problem-thanks"], [data-testid="report-problem-undelivered"]')
    .first()
    .waitFor({ timeout: 15000 });
  assert.equal(
    await page.getByTestId("report-problem-form").count(),
    0,
    "a child screen must never offer a free-text feedback box"
  );

  // A re-ask writes nothing server-side, so closing the context leaves no trace at all.
  // That the re-ask *closes* on the next submission is asserted in
  // tests/ux-v11-monster-journey.test.mjs, where it records no attempt and costs no browser.
  } finally {
    await context.close();
  }
}

async function passTask(page, task, finalTask) {
  const workspace = page.getByTestId(`task-workspace-${task.family}`);
  const submit = workspace.getByRole("button", { name: "Проверить", exact: true });
  await assert.doesNotReject(() => submit.waitFor({ state: "attached" }));
  assert.equal(await submit.isEnabled(), true, `${task.id} primary action is enabled after visible input`);
  await submitCurrentTask(page, workspace);
  if (!finalTask) {
    const next = page.getByRole("button", { name: "Дальше", exact: true });
    await next.waitFor({ timeout: 20000 });
    await next.click();
  }
}

async function verifyMobile(browser, baseUrl, outDir) {
  const context = await browser.newContext({
    viewport: { width: 320, height: 780 },
    reducedMotion: "reduce",
  });
  try {
    await installAcademyBrowserRoutes(context);
    const page = await context.newPage();
    const browserDiagnostics = [];
    page.on("pageerror", (error) => browserDiagnostics.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning" || message.text().includes("academy-session-effect")) browserDiagnostics.push(`console-${message.type()}: ${message.text()}`);
    });
    page.on("response", (response) => {
      if (response.url().includes("/api/")) browserDiagnostics.push(`api ${response.status()} ${response.url()}`);
      if (response.url().endsWith("page.js")) browserDiagnostics.push(`page-script ${response.status()} ${response.headers()["content-type"] ?? "no-content-type"}`);
      if (response.url().includes("/_next/static/") && response.status() >= 400) browserDiagnostics.push(`static ${response.status()} ${response.url()}`);
    });
    page.on("requestfailed", (request) => {
      if (request.url().includes("/_next/") || request.url().includes("clerk.accounts")) browserDiagnostics.push(`failed ${request.url()} ${request.failure()?.errorText ?? "unknown"}`);
    });
    const navigation = await page.goto(`${baseUrl}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
    try {
      await page.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 30000 });
    } catch (error) {
      await page.screenshot({ path: join(outDir, "mobile-320-failure.png"), fullPage: true }).catch(() => {});
      writeFileSync(join(outDir, "mobile-320-failure.html"), await page.content(), "utf8");
      const apiProbe = await page.evaluate(async () => {
        const result = {};
        for (const path of ["/api/tasks/session/w1-s1", "/api/user"]) {
          try {
            const response = await fetch(path);
            const body = await response.text();
            result[path] = { status: response.status, taskCount: path.includes("/session/") ? JSON.parse(body).session?.tasks?.length : undefined };
          } catch (probeError) {
            result[path] = { error: String(probeError) };
          }
        }
        return result;
      });
      const runtimeProbe = await page.evaluate(async () => {
        const pageScript = [...document.scripts].find((script) => script.src.includes("/session/") && script.src.endsWith("page.js"));
        let pageScriptBody = "";
        if (pageScript?.src) {
          try { pageScriptBody = await fetch(pageScript.src).then((response) => response.text()); } catch { /* diagnostic only */ }
        }
        return {
        readyState: document.readyState,
        scriptCount: document.scripts.length,
        scriptSources: [...document.scripts].map((script) => script.src).filter((src) => src.includes("session") || src.includes("page_tsx")),
        loadedScripts: performance.getEntriesByType("resource").filter((entry) => entry.name.includes("/_next/static/chunks/")).length,
        pageScriptBytes: pageScriptBody.length,
        pageScriptHasEffectLog: pageScriptBody.includes("academy-session-effect:start"),
        bodyText: document.body.innerText.slice(0, 300),
        };
      });
      throw new Error(`mobile workspace unavailable: status=${navigation?.status() ?? "none"} url=${page.url()} title=${await page.title()} cause=${error instanceof Error ? error.message : String(error)} api=${JSON.stringify(apiProbe)} runtime=${JSON.stringify(runtimeProbe)} browser=${browserDiagnostics.join(" | ")}`);
    }
    const overflow = await page.evaluate(() => {
      const width = window.innerWidth;
      return [...document.querySelectorAll("*")]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.right > width + 1 || rect.left < -1)
        .slice(0, 8)
        .map(({ element, rect }) => ({ tag: element.tagName, testId: element.getAttribute("data-testid"), className: element.className, left: rect.left, right: rect.right, width: rect.width }));
    });
    assert.equal(overflow.length, 0, `320px viewport has horizontal overflow: ${JSON.stringify(overflow)}`);
    const firstCell = page.getByRole("button", { name: "Выбрать клетку 1, 1", exact: true });
    await firstCell.focus();
    await page.keyboard.press("Space");
    assert.equal(await firstCell.getAttribute("aria-pressed"), "true", "grid cell works from keyboard");
    await page.keyboard.press("Space");
    assert.equal(await firstCell.getAttribute("aria-pressed"), "false", "keyboard toggles deterministically");
    await page.screenshot({ path: join(outDir, "mobile-320-w1-s1.png"), fullPage: true });
  } finally {
    await context.close();
  }
}

async function verifyAllSessions(browser, baseUrl, outDir) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const pageErrors = [];
  let taskCount = 0;
  const families = new Set();
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    await installAcademyBrowserRoutes(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 500) pageErrors.push(`HTTP ${response.status()} ${response.url()}`);
    });
    page.on("requestfailed", (request) => {
      if (request.url().includes("/_next/") || request.url().includes("/api/")) {
        pageErrors.push(`failed ${request.url()} ${request.failure()?.errorText ?? "unknown"}`);
      }
    });

    const curriculum = loadCurriculum();

    /**
     * Warm the route before anything is asserted. `next dev` compiles a route on its
     * first request, and on a cold CI runner that first compile of /session/[id] takes
     * longer than any per-assertion timeout is willing to wait — the suite then reports
     * "workspace never appeared", which reads like a product defect and is not one.
     * One patient navigation up front, then every later wait can stay short and mean
     * what it says.
     */
    await page.goto(`${baseUrl}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
    try {
      await page.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 180000 });
    } catch (error) {
      // A bare timeout here says "the workspace never appeared" and nothing else, which
      // is indistinguishable between a slow compile, a failing API, a crashed bundle and
      // a redirect. Make the first failure carry its own diagnosis.
      const probe = await page.evaluate(async () => {
        const out = {};
        for (const path of ["/api/tasks/session/w1-s1", "/api/user"]) {
          try {
            const r = await fetch(path);
            out[path] = { status: r.status, body: (await r.text()).slice(0, 300) };
          } catch (e) {
            out[path] = { error: String(e) };
          }
        }
        return out;
      });
      throw new Error(
        `warm-up: workspace never rendered.\n` +
          `url=${page.url()}\n` +
          `title=${await page.title()}\n` +
          `body=${(await page.locator("body").innerText()).slice(0, 400)}\n` +
          `api=${JSON.stringify(probe)}\n` +
          `pageErrors=${pageErrors.join(" | ") || "(none)"}\n` +
          `cause=${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Before the drive: w1-s1 is the only session guaranteed open, and the drive would
    // destroy this state by passing every task in it.
    await assertReaskFlow(page.context().browser(), baseUrl, outDir);

    for (const sessionId of SESSION_IDS) {
      const session = curriculum.find((candidate) => candidate.id === sessionId);
      assert.ok(session, `curriculum contains ${sessionId}`);
      const navigation = await page.goto(`${baseUrl}/session/${sessionId}?demo=1`, { waitUntil: "domcontentloaded" });
      try {
        // 45s, not 20s: this is the FIRST paint of a route the dev server has not
        // compiled yet, and webpack's cold compile of a workspace family can outrun 20s
        // on a loaded machine. Two runs of this gate died here on a route that was fine —
        // a gate that cries wolf gets ignored, which is worse than a slow gate. A real
        // breakage still fails, just later.
        await page.getByTestId(`task-workspace-${session.tasks[0].family}`).waitFor({ timeout: 45000 });
      } catch (error) {
        await page.screenshot({ path: join(outDir, "desktop-session-failure.png"), fullPage: true }).catch(() => {});
        const apiProbe = await page.evaluate(async () => {
          const result = {};
          for (const path of ["/api/tasks/session/w1-s1", "/api/user"]) {
            try {
              const response = await fetch(path);
              result[path] = { status: response.status };
            } catch (probeError) {
              result[path] = { error: String(probeError) };
            }
          }
          return result;
        });
        throw new Error(`desktop workspace unavailable for ${sessionId}: status=${navigation?.status() ?? "none"} url=${page.url()} title=${await page.title()} body=${(await page.locator("body").innerText()).slice(0, 300)} api=${JSON.stringify(apiProbe)} diagnostics=${pageErrors.join(" | ")} cause=${error instanceof Error ? error.message : String(error)}`);
      }
      if (sessionId === "w1-s1") {
        await page.screenshot({ path: join(outDir, "desktop-w1-s1.png"), fullPage: true });
      }

      for (const [index, task] of session.tasks.entries()) {
        families.add(task.family);
        await driveTask(page, task);
        await passTask(page, task, index === session.tasks.length - 1);
        taskCount += 1;
      }

      if (sessionId === "w5-s3") {
        await page.getByRole("heading", { name: "Итог: своими словами" }).waitFor({ timeout: 20000 });
        await page.getByTestId("formulation-input").fill("Сначала проверить условие, затем проверить результат.");
        await page.getByTestId("formulation-submit").click();
        await page.getByTestId("capstone-calm-closure").waitFor({ timeout: 20000 });
      } else {
        await page.getByRole("heading", { name: "Сессия пройдена!" }).waitFor({ timeout: 20000 });
      }

      // The growth moment. A part must arrive where the child actually is — the third
      // session of a week — and must NOT appear on the other two, or the reward stops
      // meaning "you finished something". w5-s3 exits through the capstone, so this
      // also proves the wings are not lost on the one screen that takes a different path.
      const closed = weekClosedBy(sessionId);
      const growth = page.getByTestId("monster-growth");
      if (closed) {
        await growth.waitFor({ timeout: 20000 });
        const text = await growth.innerText();
        assert.ok(
          text.includes(closed.partGrownRu),
          `${sessionId}: growth card must announce "${closed.partGrownRu}", got: ${text.slice(0, 160)}`
        );
        assert.ok(
          text.includes(closed.partMeaningRu),
          `${sessionId}: growth card must give the reason, not just the part`
        );
        // Whose monster is it? The gradient id is derived from the fill colour, so this
        // fails if the card falls back to the store's default instead of the child's own
        // monster — the exact bug the server hydration on this page exists to prevent.
        assert.equal(
          await growth.locator(`#monster-grad-${FIXTURE_MONSTER_COLOR.slice(1)}`).count(),
          1,
          `${sessionId}: growth card must draw the child's own monster, not the store default`
        );
        // One frame of the first growth, kept as evidence: a text assertion cannot tell
        // anyone whether the monster is clipped, off-palette, or drawn without its part.
        if (sessionId === "w1-s3") {
          await page.screenshot({ path: join(outDir, "desktop-w1-s3-growth.png"), fullPage: true });
        }
      } else {
        assert.equal(
          await growth.count(),
          0,
          `${sessionId} closes no week, so it must not congratulate a growth`
        );
      }
    }

    assert.deepEqual([...families].sort(), ["claim-check", "grid-draw", "pattern-expand", "rule-runner", "sequence-world"]);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    return { sessions: SESSION_IDS.length, tasks: taskCount, families: families.size };
  } finally {
    await context.tracing.stop({ path: join(outDir, "current-session-chromium-trace.zip") });
    await context.close();
  }
}

function browserBinaryUnavailable(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /executable (?:doesn't|does not) exist|browserType\.launch:.*not found|please run.*playwright install/i.test(message);
}

function crossBrowserFailureReason(browserName, milestone, error) {
  if (browserBinaryUnavailable(error)) return `${browserName} executable unavailable`;
  return `${browserName} smoke failed at ${milestone}`;
}

async function verifyCrossBrowserSmoke(browserType, browserName, baseUrl, outDir) {
  let browser = null;
  let context = null;
  let milestone = "entry";
  const artifacts = [`current-session-${browserName}-trace.zip`, `current-session-${browserName}-capstone.png`];
  try {
    try {
      browser = await browserType.launch({ headless: true });
    } catch (error) {
      return {
        browser: browserName,
        verdict: browserBinaryUnavailable(error) ? "BLOCKED" : "FAIL",
        milestones: { entry: false, reloadResume: false, capstone: false },
        reason: crossBrowserFailureReason(browserName, milestone, error),
        artifacts: [],
      };
    }

    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: "reduce",
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    await installAcademyBrowserRoutes(context);
    const page = await context.newPage();

    await page.goto(`${baseUrl}/session/w5-s3?demo=1`, { waitUntil: "domcontentloaded" });
    const firstWorkspace = page.getByTestId("task-workspace-rule-runner");
    await firstWorkspace.waitFor({ timeout: 30000 });
    const initialPrompt = await page.getByTestId("task-prompt-caption").innerText();
    milestone = "reloadResume";
    await page.reload({ waitUntil: "commit" });
    await page.getByTestId("task-workspace-rule-runner").waitFor({ timeout: 30000 });
    assert.equal(
      await page.getByTestId("task-prompt-caption").innerText(),
      initialPrompt,
      `${browserName} reload changed the visible task`
    );

    milestone = "capstone";
    const curriculum = loadCurriculum();
    const capstone = curriculum.find((session) => session.id === "w5-s3");
    assert.ok(capstone, "curriculum contains capstone session");
    for (const [index, task] of capstone.tasks.entries()) {
      milestone = `capstone:w5-s3:${task.id}`;
      await driveTask(page, task);
      await passTask(page, task, index === capstone.tasks.length - 1);
    }
    await page.getByRole("heading", { name: "Итог: своими словами" }).waitFor({ timeout: 30000 });
    await page.getByTestId("formulation-input").fill("Сначала проверить условие, затем проверить результат.");
    await page.getByTestId("formulation-submit").click();
    await page.getByTestId("capstone-calm-closure").waitFor({ timeout: 30000 });
    // WebKit's full-page screenshot waits indefinitely for a font-face that is
    // already represented in the trace. Keep the functional capstone proof and
    // trace screenshots for WebKit; capture the explicit full-page artifact in
    // Chromium/Firefox where the engine completes deterministically.
    if (browserName !== "webkit") {
      await page.screenshot({ path: join(outDir, `current-session-${browserName}-capstone.png`), fullPage: true });
    }
    return {
      browser: browserName,
      verdict: "PASS",
      milestones: { entry: true, reloadResume: true, capstone: true },
      artifacts,
    };
  } catch (error) {
    return {
      browser: browserName,
      verdict: browserBinaryUnavailable(error) ? "BLOCKED" : "FAIL",
      milestones: {
        entry: milestone !== "entry",
        reloadResume: milestone === "capstone",
        capstone: false,
      },
      reason: `${crossBrowserFailureReason(browserName, milestone, error)}: ${error instanceof Error ? error.message : String(error)}`,
      artifacts: [],
    };
  } finally {
    if (context) await context.tracing.stop({ path: join(outDir, `current-session-${browserName}-trace.zip`) }).catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

async function verifyCrossBrowserSmokes(baseUrl, databaseUrl, outDir) {
  const checks = [
    ["firefox", firefox],
    ["webkit", webkit],
  ];
  const browsers = [];
  for (const [browserName, browserType] of checks) {
    // Reuse one Next process, but reset only the throwaway SQLite fixture. This
    // prevents state leakage without concurrent dev servers touching `.next`.
    resetCrossBrowserFixture(databaseUrl);
    seedUnlockedCapstone(databaseUrl);
    browsers.push(await verifyCrossBrowserSmoke(browserType, browserName, baseUrl, outDir));
  }
  const verdict = browsers.some((item) => item.verdict === "FAIL")
    ? "FAIL"
    : browsers.some((item) => item.verdict === "BLOCKED")
      ? "BLOCKED"
      : "PASS";
  return { verdict, browsers };
}

function persistReceipt(outDir, receipt) {
  writeFileSync(join(outDir, "browser-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

export async function runCurrentSessionUiSuite(options = {}) {
  const crossBrowser = Boolean(options.crossBrowser);
  const outDir = evidenceDirectory();
  mkdirSync(outDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const tempRoot = mkdtempSync(join(tmpdir(), "mindshift-current-session-"));
  const databasePath = join(tempRoot, "academy.db").replaceAll("\\", "/");
  const databaseUrl = `file:${databasePath}`;
  let server = null;
  let serverLog = () => "";
  let browser = null;

  try {
    /**
     * BLOCKED, not FAIL, when the app cannot even boot.
     *
     * Every page is wrapped in `ClerkProvider`, which throws during render without a
     * publishable key. On a developer machine `next dev` reads one from an untracked
     * `.env.local`, so this suite silently depended on one person's filesystem; on a
     * clean CI checkout it does not exist and the run reported "the workspace never
     * appeared", which reads like a product defect. It is a configuration gap.
     *
     * A publishable key is public by design — it ships to every browser — so this
     * belongs in a repository *variable*, not a secret. Until one is set, say so in the
     * verdict rather than dressing an unconfigured runner as a red gate or, worse, a
     * green one.
     */
    // Two legitimate sources: the runner's environment (CI) or an untracked `.env.local`
    // that `next dev` loads itself (a developer machine). Existence only — this never
    // reads the file, so no key value can reach a log.
    // BOTH keys, not either. The first version checked only the publishable key, so
    // supplying that one alone walked the suite past this guard and into a genuine
    // "Missing secretKey" crash — a configuration gap reported as a red gate again, one
    // level further in. The app boots only when Clerk has both halves.
    const hasEnvFile =
      existsSync(join(root, ".env.local")) || existsSync(join(root, ".env"));
    const bootable =
      hasEnvFile ||
      (Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) &&
        Boolean(process.env.CLERK_SECRET_KEY?.trim()));
    if (!bootable) {
      const receipt = {
        verdict: "BLOCKED",
        startedAt,
        finishedAt: new Date().toISOString(),
        reason:
          "Clerk is not fully configured, so the app cannot boot and nothing was " +
          "certified. BOTH keys are required: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY " +
          `(${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ? "set" : "MISSING"}) ` +
          `and CLERK_SECRET_KEY (${process.env.CLERK_SECRET_KEY?.trim() ? "set" : "MISSING"}). ` +
          "The publishable key is public by design and belongs in an Actions repository " +
          "VARIABLE; the secret key is a real credential and belongs in an Actions SECRET. " +
          "Placeholders do not work for either: the publishable key encodes the Clerk " +
          "instance host, and a fake secret fails the middleware handshake with a 500.",
      };
      persistReceipt(outDir, receipt);
      console.error(`CURRENT_SESSION_UI BLOCKED: ${receipt.reason}`);
      return receipt;
    }

    assert.equal(hasDevTestBypass(new Headers({ "x-test-bypass": "true" }), "production"), false, "production rejects the test seam");
    await prepareDatabase(databaseUrl, process.env);
    seedMonster(databaseUrl);
    const port = await freePort();
    const running = startServer(port, databaseUrl);
    server = running.child;
    serverLog = () => running.output().split("\n").filter((line) => /error|failed|exception|500/i.test(line)).slice(-12).join(" | ");
    await running.ready;
    const baseUrl = `http://localhost:${port}`;

    try {
      browser = await chromium.launch({ headless: true });
    } catch (error) {
      const receipt = {
        verdict: "BLOCKED",
        startedAt,
        finishedAt: new Date().toISOString(),
        reason: `Chromium unavailable: ${error instanceof Error ? error.message : String(error)}`,
      };
      persistReceipt(outDir, receipt);
      return receipt;
    }

    const coverage = await verifyAllSessions(browser, baseUrl, outDir);
    await browser.close();
    browser = null;

    // The full desktop run intentionally completes w1-s1. Reset the throwaway
    // learner before capturing independent 320px first-session evidence.
    resetCrossBrowserFixture(databaseUrl);
    browser = await chromium.launch({ headless: true });
    await verifyMobile(browser, baseUrl, outDir);
    await browser.close();
    browser = null;

    let crossBrowserEvidence = null;
    if (crossBrowser) {
      crossBrowserEvidence = await verifyCrossBrowserSmokes(baseUrl, databaseUrl, outDir);
    }
    const receipt = {
      verdict: crossBrowserEvidence?.verdict ?? "PASS",
      startedAt,
      finishedAt: new Date().toISOString(),
      browser: "chromium",
      sessions: coverage.sessions,
      tasks: coverage.tasks,
      families: coverage.families,
      viewports: ["320x780 reduced-motion", "1280x900"],
      keyboard: true,
      directAttemptCallsFromTest: false,
      productionBypassAccepted: false,
      artifacts: ["mobile-320-w1-s1.png", "desktop-w1-s1.png", "current-session-chromium-trace.zip"],
      ...(crossBrowserEvidence ? { crossBrowser: crossBrowserEvidence } : {}),
    };
    persistReceipt(outDir, receipt);
    console.log(`CURRENT_SESSION_UI: ${coverage.sessions}/15 sessions, ${coverage.tasks} tasks, ${coverage.families}/5 families`);
    if (crossBrowserEvidence) {
      for (const browserEvidence of crossBrowserEvidence.browsers) {
        console.log(`CURRENT_SESSION_CROSS_BROWSER: ${browserEvidence.browser} ${browserEvidence.verdict}`);
      }
    }
    console.log(`BROWSER_EVIDENCE=${outDir}`);
    return receipt;
  } catch (error) {
    const receipt = {
      verdict: "FAIL",
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: error instanceof Error ? error.message : String(error),
      serverDiagnostics: serverLog(),
    };
    persistReceipt(outDir, receipt);
    console.error(receipt.reason);
    return receipt;
  } finally {
    if (browser) await browser.close();
    await stopServer(server);
  }
}
