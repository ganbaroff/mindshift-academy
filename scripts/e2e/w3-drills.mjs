#!/usr/bin/env node
/**
 * W3 e2e/static drills — capstone copy + certificate route protection markers.
 * Full authenticated print flow is covered by unit eligibility + protected matcher.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");
const BASE = process.env.BASE_URL || "http://localhost:3015";
const AUTO_START = process.env.AUTO_START !== "0";
const OUT = join(root, "docs", "release", "_w3_drill_workspace");

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

let serverProc = null;
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
  if (await isReachable()) return;
  if (!AUTO_START) throw new Error(`No server at ${BASE}`);
  const port = new URL(BASE).port || "3015";
  const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
  serverProc = spawn(process.execPath, [nextCli, "dev", "-p", port], {
    cwd: root,
    stdio: "ignore",
  });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (await isReachable()) return;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error("Server failed to start");
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const proxy = readFileSync(join(root, "src/proxy.ts"), "utf8");
  record("proxy protects /certificate", proxy.includes('"/certificate(.*)"'));

  const calm = readFileSync(join(root, "src/components/capstone/CalmClosure.tsx"), "utf8");
  record("calm closure has monster stays line", calm.includes("остаётся с тобой"));
  record("calm closure links certificate", calm.includes("/certificate"));

  const certPage = readFileSync(join(root, "src/app/certificate/page.tsx"), "utf8");
  record("certificate print CSS present", certPage.includes("@media print"));
  record("certificate default label present", certPage.includes("Участник MindShift V1"));

  await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const certNav = await page.goto(`${BASE}/certificate`, { waitUntil: "domcontentloaded" });
  const status = certNav?.status() ?? 0;
  // Anonymous must be redirected to sign-in (protected) — not a bare 200 open cert.
  const url = page.url();
  const gated =
    status === 307 ||
    status === 302 ||
    url.includes("sign-in") ||
    url.includes("sign-up") ||
    status === 401;
  record("anonymous /certificate is gated", gated, `status=${status} url=${url}`);

  // Never PASS a 500.
  const api = await fetch(`${BASE}/api/certificate`, {
    headers: { "x-test-bypass": "true" },
  });
  if (api.status === 500) {
    record("certificate API never 500 for auth/bypass", false, "status=500");
  } else if (api.status === 401 || api.status === 403 || api.status === 200 || api.status === 404) {
    record("certificate API returns clean auth/success status", true, `status=${api.status}`);
  } else {
    record("certificate API expected status", false, `status=${api.status}`);
  }

  await browser.close();
  stopServer();

  const failed = results.filter((r) => !r.pass);
  const report = [
    "# W3 E2E drill receipt",
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
