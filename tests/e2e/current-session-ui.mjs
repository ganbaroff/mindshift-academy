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
const { hasDevTestBypass } = require(join(root, "src/lib/request-access.ts"));

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
    [prismaCli, "db", "push", "--skip-generate"],
    { ...env, DATABASE_URL: databaseUrl }
  );
  if (result.code !== 0) throw new Error(`Prisma test database failed (${result.code}): ${result.output}`);
}

function startServer(port, databaseUrl) {
  const nextCli = join(root, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], {
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
    await workspace.getByRole("button", { name: "Проверить", exact: true }).click();
    await page.getByRole("button", { name: /Попробовать ещё или дальше/ }).waitFor();
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

async function driveTask(page, task) {
  await page.getByTestId(`task-workspace-${task.family}`).waitFor();
  await assert.doesNotReject(() => page.getByTestId("task-prompt-caption").filter({ hasText: task.promptRu }).waitFor());
  if (task.family === "grid-draw") await driveGrid(page, task);
  else if (task.family === "sequence-world") await driveSequence(page);
  else if (task.family === "rule-runner") await driveRule(page, task);
  else if (task.family === "pattern-expand") await drivePattern(page, task);
  else await driveClaims(page, task);
}

async function passTask(page, task, finalTask) {
  const workspace = page.getByTestId(`task-workspace-${task.family}`);
  const submit = workspace.getByRole("button", { name: "Проверить", exact: true });
  await assert.doesNotReject(() => submit.waitFor());
  assert.equal(await submit.isEnabled(), true, `${task.id} primary action is enabled after visible input`);
  await submit.click();
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
    extraHTTPHeaders: { "x-test-bypass": "true" },
  });
  try {
    const page = await context.newPage();
    await page.goto(`${baseUrl}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("task-workspace-grid-draw").waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "320px viewport has no horizontal overflow");
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
    extraHTTPHeaders: { "x-test-bypass": "true" },
  });
  const pageErrors = [];
  let taskCount = 0;
  const families = new Set();
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 500) pageErrors.push(`HTTP ${response.status()} ${response.url()}`);
    });

    const curriculum = loadCurriculum();
    for (const sessionId of SESSION_IDS) {
      const session = curriculum.find((candidate) => candidate.id === sessionId);
      assert.ok(session, `curriculum contains ${sessionId}`);
      await page.goto(`${baseUrl}/session/${sessionId}?demo=1`, { waitUntil: "domcontentloaded" });
      await page.getByTestId(`task-workspace-${session.tasks[0].family}`).waitFor({ timeout: 20000 });
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
    }

    assert.deepEqual([...families].sort(), ["claim-check", "grid-draw", "pattern-expand", "rule-runner", "sequence-world"]);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    return { sessions: SESSION_IDS.length, tasks: taskCount, families: families.size };
  } finally {
    await context.tracing.stop({ path: join(outDir, "current-session-chromium-trace.zip") });
    await context.close();
  }
}

function persistReceipt(outDir, receipt) {
  writeFileSync(join(outDir, "browser-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

export async function runCurrentSessionUiSuite() {
  const outDir = evidenceDirectory();
  mkdirSync(outDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const tempRoot = mkdtempSync(join(tmpdir(), "mindshift-current-session-"));
  const databasePath = join(tempRoot, "academy.db").replaceAll("\\", "/");
  const databaseUrl = `file:${databasePath}`;
  let server = null;
  let browser = null;

  try {
    assert.equal(hasDevTestBypass(new Headers({ "x-test-bypass": "true" }), "production"), false, "production rejects the test seam");
    await prepareDatabase(databaseUrl, process.env);
    const port = await freePort();
    const running = startServer(port, databaseUrl);
    server = running.child;
    await running.ready;
    const baseUrl = `http://127.0.0.1:${port}`;

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

    await verifyMobile(browser, baseUrl, outDir);
    const coverage = await verifyAllSessions(browser, baseUrl, outDir);
    const receipt = {
      verdict: "PASS",
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
    };
    persistReceipt(outDir, receipt);
    console.log(`CURRENT_SESSION_UI: ${coverage.sessions}/15 sessions, ${coverage.tasks} tasks, ${coverage.families}/5 families`);
    console.log(`BROWSER_EVIDENCE=${outDir}`);
    return receipt;
  } catch (error) {
    const receipt = {
      verdict: "FAIL",
      startedAt,
      finishedAt: new Date().toISOString(),
      reason: error instanceof Error ? error.message : String(error),
    };
    persistReceipt(outDir, receipt);
    console.error(receipt.reason);
    return receipt;
  } finally {
    if (browser) await browser.close();
    await stopServer(server);
  }
}
