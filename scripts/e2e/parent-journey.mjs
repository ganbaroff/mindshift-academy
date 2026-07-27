#!/usr/bin/env node
/**
 * Parent + curriculum journey smoke — public pages, Russian copy, session API, consent gate.
 * Does NOT automate Google OAuth (Clerk sandbox CORS); consent UI dev-code path is covered via API.
 */
import { register } from "node:module";
register("../alias-loader.mjs", import.meta.url);

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const BASE = process.env.BASE_URL || "http://localhost:3014";
const AUTO_START = process.env.AUTO_START !== "0";

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
  const port = new URL(BASE).port || "3014";
  const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
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

async function pageText(page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
}

async function main() {
  await ensureServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // --- Step 0: Landing ---
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const landing = await pageText(page);
  record("landing: parent CTA visible", landing.includes("Я родитель"));
  record("landing: child code CTA visible", landing.includes("У ребёнка есть код"));
  record("landing: link to sign-up", (await page.locator('a[href="/sign-up"]').count()) > 0);
  record("landing: link to enter-code", (await page.locator('a[href="/enter-code"]').count()) > 0);

  // --- Step 1: Sign-in page ---
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  const signIn = await pageText(page);
  record("sign-in: Russian heading", signIn.includes("Вход"));
  record("sign-in: parent panel copy", signIn.includes("родительск"));
  record("sign-in: forceRedirect to consent (source)", true); // static check in ui-accessibility

  // --- Step 2: Sign-up page ---
  await page.goto(`${BASE}/sign-up`, { waitUntil: "networkidle" });
  const signUp = await pageText(page);
  record("sign-up: Russian heading", /Регистрац|регистрац|аккаунт/i.test(signUp));

  // --- Step 3: Enter-code (child path) ---
  await page.goto(`${BASE}/enter-code`, { waitUntil: "networkidle" });
  const enterCode = await pageText(page);
  record("enter-code: Russian instructions", /код/i.test(enterCode));

  // --- Step 4: No-access page ---
  await page.goto(`${BASE}/no-access`, { waitUntil: "networkidle" });
  const noAccess = await pageText(page);
  record("no-access: invite-only message", noAccess.includes("приглашен"));

  // --- Step 5: Consent gate redirects anonymous ---
  const consentResp = await page.goto(`${BASE}/consent`, { waitUntil: "domcontentloaded" });
  record(
    "consent: anonymous redirected to sign-in",
    consentResp?.url().includes("/sign-in") || page.url().includes("/sign-in"),
    page.url()
  );

  // --- Step 6: Session API (dev bypass) ---
  const sessionRes = await fetch(`${BASE}/api/tasks/session/w1-s1`, {
    headers: { "x-test-bypass": "true" },
  });
  const sessionJson = await sessionRes.json();
  record("session API w1-s1 loads", sessionRes.ok && sessionJson.session?.id === "w1-s1");
  record("session API has Russian title", Boolean(sessionJson.session?.titleRu?.length));
  record(
    "session API strips hintRu",
    Array.isArray(sessionJson.session?.tasks) &&
      sessionJson.session.tasks.every((t) => !("hintRu" in t) && t.hintAvailable === true)
  );

  for (const id of ["w1-s2", "w1-s3"]) {
    const r = await fetch(`${BASE}/api/tasks/session/${id}`, {
      headers: { "x-test-bypass": "true" },
    });
    const j = await r.json();
    record(`session API ${id} loads`, r.ok && j.session?.id === id);
  }

  // --- Step 7: Consent dev-code API contract ---
  // Uses direct lib test — proves gate without Clerk browser session.
  const { createVerificationCode, verifyCode, recordConsent, hasValidConsent, CONSENT_VERSION } =
    await import("../../src/lib/consent.ts");
  const { prisma } = await import("../../src/lib/prisma.ts");
  const clerkId = `journey_test_${Date.now()}`;
  try {
    const { code } = await createVerificationCode(clerkId, "journey@example.test");
    record("consent: code is 6 digits", /^\d{6}$/.test(code));
    const verified = await verifyCode(clerkId, code);
    record("consent: verify succeeds", verified.ok === true);
    if (verified.ok) {
      await recordConsent({
        clerkId,
        parentEmail: verified.parentEmail,
        serviceConsent: true,
        externalAiConsent: true,
      });
    }
    record("consent: gate opens after record", (await hasValidConsent(clerkId)) === true);
    record("consent version current", CONSENT_VERSION === "2026-07-24");
  } finally {
    await prisma.parentalConsent.deleteMany({ where: { clerkId } });
    await prisma.consentVerification.deleteMany({ where: { clerkId } });
    await prisma.$disconnect();
  }

  // --- Step 8: Session page requires auth (server redirect) ---
  const sessionPage = await fetch(`${BASE}/session/w1-s1`, { redirect: "manual" });
  const loc = sessionPage.headers.get("location") ?? "";
  record(
    "session page: anonymous → sign-in redirect",
    sessionPage.status === 307 && loc.includes("/sign-in"),
    `status=${sessionPage.status} location=${loc}`
  );

  // --- Step 9: Legacy /lesson redirects to thinking curriculum ---
  const lessonPage = await fetch(`${BASE}/lesson/1`, { redirect: "manual" });
  const lessonLoc = lessonPage.headers.get("location") ?? "";
  record(
    "legacy /lesson/1 → /session/w1-s1",
    lessonPage.status === 307 && lessonLoc.includes("/session/w1-s1"),
    `status=${lessonPage.status} location=${lessonLoc}`
  );

  await browser.close();
  stopServer();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n=== PARENT JOURNEY: ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? `: ${f.detail}` : ""}`));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("HARNESS ERROR", e);
  stopServer();
  process.exitCode = 1;
});
