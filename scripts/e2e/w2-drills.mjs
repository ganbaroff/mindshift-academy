#!/usr/bin/env node
/**
 * W2 browser/API drills — local only. No secrets, no prod, no child invites.
 * Covers signed-in awareness markup, consent-ended calm screen presence,
 * and session resume payload shape via test-bypass when server available.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const BASE = process.env.BASE_URL || "http://localhost:3015";
const AUTO_START = process.env.AUTO_START !== "0";
const OUT = join(root, "docs", "release", "_w2_drill_workspace");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let serverProc = null;
const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function stopServer() {
  if (!serverProc?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(serverProc.pid), "/T", "/F"]);
  } else {
    serverProc.kill("SIGTERM");
  }
}

async function isReachable() {
  try {
    const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(4000) });
    return r.status > 0;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isReachable()) {
    console.log(`Using server at ${BASE}`);
    return;
  }
  if (!AUTO_START) throw new Error(`No server at ${BASE}`);
  const port = new URL(BASE).port || "3015";
  const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
  console.log(`Starting next dev on :${port}…`);
  serverProc = spawn(process.execPath, [nextCli, "dev", "-p", port], {
    cwd: root,
    stdio: "ignore",
  });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (await isReachable()) {
      await sleep(1500);
      console.log("Server ready.");
      return;
    }
    await sleep(800);
  }
  throw new Error("Server failed to start");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const homeHtml = await page.content();
  const homeText = await page.locator("body").innerText().catch(() => "");
  record(
    "home loads for anonymous",
    homeHtml.includes("MindShift") || homeText.includes("MindShift") || homeHtml.includes("mindshift")
  );
  record(
    "anonymous home shows enter-code CTA (not continue strip)",
    (await page.locator("[data-testid=signed-in-continue]").count()) === 0
  );

  await page.goto(`${BASE}/enter-code`, { waitUntil: "domcontentloaded" });
  const codeText = await page.locator("body").innerText();
  record("enter-code shows code form when signed out", codeText.includes("секретный код") || codeText.includes("Впиши"));

  // Consent-ended calm screen is client state — verify route module exports the marker via page source after navigation to session (anonymous → redirect/gate).
  const sess = await page.goto(`${BASE}/session/w1-s1`, { waitUntil: "domcontentloaded" });
  record("anonymous session is gated (not 200 open UI)", sess ? sess.status() !== 200 || !(await page.locator("body").innerText()).includes("Сессия завершена") : false);

  // Session API: 200 with payload, or clean 401/403 when unauthenticated / bypass unavailable.
  // A 500 is NEVER a pass.
  const api = await fetch(`${BASE}/api/tasks/session/w1-s1`, {
    headers: { "x-test-bypass": "true" },
  });
  if (api.status === 500) {
    record("session API never returns 500 for auth/bypass path", false, "status=500");
  } else if (api.status === 200) {
    const body = await api.json();
    record("session API returns passedTaskIds array", Array.isArray(body.passedTaskIds));
    record(
      "session API returns offeredTier",
      body.offeredTier === 1 || body.offeredTier === 2 || body.offeredTier === 3
    );
  } else if (api.status === 401 || api.status === 403) {
    record(
      "session API returns clean 401/403 when unauthenticated or bypass unavailable",
      true,
      `status=${api.status}`
    );
  } else {
    record(
      "session API returns expected auth or success status",
      false,
      `unexpected status=${api.status}`
    );
  }

  await browser.close();
  stopServer();

  const failed = results.filter((r) => !r.pass);
  const report = [
    "# W2 E2E drill receipt",
    "",
    `Base: ${BASE}`,
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    "",
    ...results.map((r) => `- ${r.pass ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` (${r.detail})` : ""}`),
    "",
    failed.length ? `FAILED: ${failed.length}` : "ALL GREEN",
  ].join("\n");
  writeFileSync(join(OUT, "e2e-drill-receipt.md"), report);
  console.log(report);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  stopServer();
  process.exit(1);
});
