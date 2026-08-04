#!/usr/bin/env node
/**
 * Focused browser smoke: child coach on /session/w1-s1
 * - SessionCoach visible → dismiss
 * - Click-primary cells + sticky Проверить
 * - Coach stays dismissed after reload
 * - Click-oriented collision prompt (no "своими словами")
 * - 320px no overflow + sticky Check present
 *
 * Uses the same local Next + SQLite + x-test-bypass seam as current-session-ui.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));

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
    child.stdout.on("data", (chunk) => {
      output = `${output}${chunk}`.slice(-12000);
    });
    child.stderr.on("data", (chunk) => {
      output = `${output}${chunk}`.slice(-12000);
    });
    child.once("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

async function prepareDatabase(databaseUrl, env) {
  const prismaCli = join(root, "node_modules/prisma/build/index.js");
  const result = await runCommand(process.execPath, [prismaCli, "db", "push"], {
    ...env,
    DATABASE_URL: databaseUrl,
  });
  if (result.code !== 0) {
    throw new Error(`Prisma test database failed (${result.code}): ${result.output}`);
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
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Next dev readiness timeout: ${output.slice(-4000)}`)),
      180000
    );
    const consume = (chunk) => {
      output = `${output}${chunk}`.slice(-16000);
      if (/Another next dev server is already running/i.test(output)) {
        clearTimeout(timeout);
        reject(new Error(`Next lock held by another dev server: ${output.slice(-1500)}`));
        return;
      }
      if (/Ready in/.test(output) && !/Another next dev server is already running/i.test(output)) {
        // Defer briefly so the lock-conflict message can still arrive after Ready.
        setTimeout(() => {
          if (/Another next dev server is already running/i.test(output)) {
            reject(new Error(`Next lock held by another dev server: ${output.slice(-1500)}`));
            return;
          }
          clearTimeout(timeout);
          resolve();
        }, 800);
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

async function waitForHttp(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`HTTP not reachable: ${url}`);
}

async function installAcademyBrowserRoutes(context) {
  await context.route("**/api/**", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), "x-test-bypass": "true" },
    });
  });
  await context.route(/clerk\.(accounts\.dev|com|dev)/i, async (route) => {
    const request = route.request();
    const destination = request.headers()["sec-fetch-dest"];
    if (destination === "document" || /\/v1\/client\/handshake/i.test(request.url())) {
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
          "access-control-allow-headers":
            request.headers()["access-control-request-headers"] || "*",
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
      await route.fulfill({
        status: response.status(),
        headers,
        body: await response.body(),
      });
    } catch {
      await route.abort().catch(() => {});
    }
  });
}

async function main() {
  const outDir = join(root, ".superpowers/sdd/evidence", `coach-smoke-${Date.now()}`);
  mkdirSync(outDir, { recursive: true });
  const tempRoot = mkdtempSync(join(tmpdir(), "mindshift-coach-smoke-"));
  const databasePath = join(tempRoot, "academy.db").replaceAll("\\", "/");
  const databaseUrl = `file:${databasePath}`;
  let server = null;
  let browser = null;
  let serverLog = () => "";

  const curriculum = loadCurriculum();
  const session = curriculum.find((s) => s.id === "w1-s1");
  assert.ok(session, "w1-s1 exists");
  const collision = session.tasks.find((t) => t.role === "collision");
  assert.ok(collision, "w1-s1 collision exists");
  assert.doesNotMatch(
    collision.promptRu,
    /своими словами/i,
    "collision prompt is click-primary"
  );

  try {
    await prepareDatabase(databaseUrl, process.env);
    const port = await freePort();
    const running = startServer(port, databaseUrl);
    server = running.child;
    serverLog = () => running.output();
    await running.ready;
    const baseUrl = `http://localhost:${port}`;
    await waitForHttp(baseUrl, 60);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
    });
    await installAcademyBrowserRoutes(context);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(`${baseUrl}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 45000 });

    // Clerk keyless / telemetry toast can sit above sticky chrome in headless.
    const clerkDismiss = page.locator("#clerk-components button", { hasText: "Dismiss" });
    if (await clerkDismiss.count()) {
      await clerkDismiss.first().click({ timeout: 3000 }).catch(() => {});
    }

    const coach = page.getByTestId("session-coach");
    await coach.waitFor({ timeout: 10000 });
    assert.match(await coach.innerText(), /Проверить/i, "coach mentions sticky Check");
    await page.getByTestId("session-coach-dismiss").click();
    await assert.rejects(
      () => coach.waitFor({ state: "visible", timeout: 1500 }),
      /Timeout|waiting/,
      "coach dismisses after Понятно"
    );

    const caption = page.getByTestId("task-prompt-caption");
    await assert.doesNotReject(() =>
      caption.filter({ hasText: collision.promptRu }).waitFor({ timeout: 5000 })
    );

    // Wrong cell first (collision pedagogy), via sticky Check
    await page.getByRole("button", { name: "Выбрать клетку 2, 1", exact: true }).click();
    const stickyCheck = page.getByTestId("session-primary-check");
    await stickyCheck.waitFor();
    assert.equal(await stickyCheck.isEnabled(), true, "sticky Check enabled after cell select");
    const formId = await stickyCheck.getAttribute("form");
    assert.ok(formId, "sticky Check is bound to workspace form");
    await stickyCheck.click({ force: true });
    await page.getByRole("button", { name: /Попробовать ещё или дальше/ }).waitFor({
      timeout: 20000,
    });

    // Retry same collision via form.requestSubmit (sticky swaps to advance after first attempt)
    await page.getByRole("button", { name: "Очистить поле", exact: true }).click();
    for (const [row, column] of collision.target) {
      await page
        .getByRole("button", {
          name: `Выбрать клетку ${row + 1}, ${column + 1}`,
          exact: true,
        })
        .click();
    }
    await page.evaluate((id) => {
      const form = document.getElementById(id);
      if (!(form instanceof HTMLFormElement)) throw new Error(`missing form ${id}`);
      form.requestSubmit();
    }, formId);
    await page.getByRole("button", { name: "Дальше", exact: true }).waitFor({ timeout: 20000 });

    assert.equal(await coach.count(), 0, "coach stays dismissed after interaction");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 45000 });
    assert.equal(await coach.count(), 0, "coach stays dismissed across reload");

    // Mobile overflow check
    await page.setViewportSize({ width: 320, height: 780 });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => {
      const width = window.innerWidth;
      return [...document.querySelectorAll("*")]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.right > width + 1 || rect.left < -1)
        .slice(0, 8)
        .map(({ element, rect }) => ({
          tag: element.tagName,
          testId: element.getAttribute("data-testid"),
          left: rect.left,
          right: rect.right,
        }));
    });
    assert.equal(overflow.length, 0, `320px overflow: ${JSON.stringify(overflow)}`);
    assert.equal(
      await page.getByTestId("session-action-bar").isVisible(),
      true,
      "sticky action bar visible at 320px"
    );

    await page.screenshot({ path: join(outDir, "coach-smoke.png"), fullPage: true });
    writeFileSync(
      join(outDir, "coach-smoke-receipt.json"),
      JSON.stringify(
        {
          verdict: "PASS",
          errors,
          outDir,
          checks: [
            "coach-visible",
            "coach-dismiss",
            "click-prompt",
            "sticky-check",
            "coach-persist-dismiss",
            "mobile-320",
          ],
        },
        null,
        2
      ),
      "utf8"
    );

    assert.equal(errors.length, 0, `page errors: ${errors.join(" | ")}`);
    console.log(`coach-smoke: PASS (evidence ${outDir})`);
    await context.close();
  } catch (error) {
    console.error("coach-smoke: FAIL", error instanceof Error ? error.message : error);
    if (typeof serverLog === "function") {
      console.error("server-log-tail:", serverLog().slice(-2000));
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopServer(server);
  }
}

await main();
