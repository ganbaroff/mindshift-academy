// End-to-end proof: drive the reframed child lessons in a REAL Chromium via Playwright,
// using ONLY the dev-only x-test-bypass seam (no Clerk password). Runs the REAL Gemini
// pipeline (moderation + judge + tutor). Screenshots saved next to this file.
import { chromium, firefox, webkit } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const BASE = process.env.BASE_URL || "http://localhost:3123";
const AUTO_START = process.env.AUTO_START !== "0";
const STARTUP_ONLY = process.env.E2E_STARTUP_ONLY === "1";
const WRONG_ANSWER_ONLY = process.env.E2E_WRONG_ANSWER_ONLY === "1";
const BROWSER_NAME = process.env.E2E_BROWSER || "chromium";
const BROWSER_TYPES = { chromium, firefox, webkit };
const INPUT_SEL = 'textarea[aria-label="Напиши промпт для питомца"]';
const SEND_SEL = 'button:has-text("Отправить промпт")';
const LOG_SEL = '[role="log"][aria-label="Чат с питомцем"]';
const MODAL_SEL = '[role="dialog"][aria-labelledby="reward-modal-title"]';
const HARMLESS_WRONG_L1_PROMPT = "asdf qwe 123 бла";
// A visible answer alone is not proof that the tutor remained in the current lesson.
// Keep these broad enough for natural provider variation, but require each reply to
// acknowledge the skill that was just demonstrated.
const LESSON_REPLY_SIGNALS = {
  1: /храбр|быстр|вес[её]л|качеств|вылуп|просып|темн|тепл|яйц|свет|кто здесь/i,
  2: /п[её]т|вес[её]л|огон|стил|говор/i,
  3: /шифр|гласн|зв[её]зд|\*/i,
  4: /собак|кошк|исправ|распозна/i,
  5: /стен|налев|иначе|лабиринт|правил/i,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
    const response = await fetch(`${BASE}/api/generate-silhouette`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isReachable()) {
    console.log(`Using server already running at ${BASE}`);
    return;
  }
  if (!AUTO_START) throw new Error(`No server at ${BASE} and AUTO_START=0.`);

  const url = new URL(BASE);
  if (url.hostname !== "localhost") {
    throw new Error("E2E auto-start requires a localhost BASE_URL so Next dev assets keep the same origin.");
  }

  const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const port = url.port || "3123";
  console.log(`No server at ${BASE} — starting \`next dev\` on port ${port}…`);
  serverProc = spawn(process.execPath, [nextCli, "dev", "-p", port], {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, E2E_LEGACY_LESSONS: "1" },
  });

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await isReachable()) {
      console.log("Server is up.");
      await sleep(1000);
      return;
    }
    await sleep(500);
  }
  throw new Error("E2E server did not become reachable in 60 seconds.");
}

// Read the ordered, non-empty chat bubbles from the DOM.
async function readMessages(page) {
  return page.evaluate((logSel) => {
    const log = document.querySelector(logSel);
    if (!log) return [];
    const rows = Array.from(log.children).filter(
      (el) => el.tagName === "DIV" && el.className.includes("gap-3")
    );
    return rows
      .map((r) => {
        const isUser = r.className.includes("self-end");
        const bubble = r.lastElementChild;
        const text = (bubble?.textContent || "").trim();
        return { isUser, text };
      })
      .filter((m) => m.text.length > 0);
  }, LOG_SEL);
}

async function monsterReplies(page) {
  const msgs = await readMessages(page);
  return msgs.filter((m) => !m.isUser).map((m) => m.text);
}

async function runLesson(page, lessonId, prompt, label) {
  const result = {
    lesson: lessonId,
    chat_responded: false,
    tutor_reply: "",
    lesson_relevant: false,
    api: null,
    reward_modal: false,
    modal_desc: "",
    screenshot_path: path.join(__dirname, `l${lessonId}.png`),
    error: null,
  };

  try {
    await page.goto(`${BASE}/lesson/${lessonId}?demo=1`, { waitUntil: "domcontentloaded" });
    // Wait for the input to exist AND be enabled (intro splash locks it ~1800ms).
    await page.waitForSelector(INPUT_SEL, { timeout: 20000 });
    await page.waitForFunction(
      (sel) => {
        const t = document.querySelector(sel);
        return t && !t.disabled;
      },
      INPUT_SEL,
      { timeout: 20000 }
    );
    await sleep(500); // let the intro-reset settle so our send isn't wiped by the mount effect

    const introReplies = await monsterReplies(page);
    const introCount = introReplies.length;

    // Send (retry once if the message doesn't register).
    async function sendOnce() {
      await page.fill(INPUT_SEL, prompt);
      await page.click(SEND_SEL);
    }

    // Register the authoritative response waiter *before* sending. An async
    // `page.on("response")` handler races the React render in WebKit: a visible
    // reply can arrive before `resp.json()` has resolved, producing a false E2E
    // failure despite a correct API response. This promise makes the response a
    // required, awaited part of the contract in every browser engine.
    const apiResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/chat") && resp.request().method() === "POST",
      { timeout: 30000 }
    );
    await sendOnce();

    // Wait for a NEW monster reply (beyond the intro) to render, up to ~30s.
    let replied = false;
    const deadline = Date.now() + 30000;
    let retried = false;
    while (Date.now() < deadline) {
      const replies = await monsterReplies(page);
      if (replies.length > introCount) {
        result.tutor_reply = replies[replies.length - 1];
        replied = true;
        break;
      }
      // If ~6s passed with no user message even registered, retry the send once.
      if (!retried && Date.now() > deadline - 30000 + 7000) {
        const msgs = await readMessages(page);
        const userEchoed = msgs.some((m) => m.isUser && m.text === prompt);
        if (!userEchoed) {
          retried = true;
          await sendOnce();
        }
      }
      await sleep(700);
    }

    const apiBody = await (await apiResponse).json();
    result.chat_responded = replied;
    result.api = apiBody;
    result.lesson_relevant = LESSON_REPLY_SIGNALS[lessonId]?.test(result.tutor_reply) ?? false;

    // Reward / completion modal.
    const modal = await page.$(MODAL_SEL);
    if (modal) {
      result.reward_modal = true;
      result.modal_desc = (await page.textContent(MODAL_SEL))?.replace(/\s+/g, " ").trim() || "";
    }

    await page.screenshot({ path: result.screenshot_path, fullPage: true });
    console.log(`[${label}] reply="${result.tutor_reply}"`);
    console.log(`[${label}] api.challengeCompleted=${apiBody?.challengeCompleted} rewardTotals=${JSON.stringify(apiBody?.rewardTotals)} judge="${apiBody?.judgeReason || ""}"`);
    console.log(`[${label}] lesson_relevant=${result.lesson_relevant} reward_modal=${result.reward_modal} desc="${result.modal_desc}"`);
  } catch (e) {
    result.error = String(e?.message || e);
    console.log(`[${label}] ERROR: ${result.error}`);
    try { await page.screenshot({ path: result.screenshot_path, fullPage: true }); } catch {}
  }
  return result;
}

async function resetTestUser() {
  // Clear the dev test user so the run is repeatable and reward modals fire on FIRST
  // completion. Best-effort: if prisma can't load here we skip and still test chat+judge
  // (lessons stay unlocked from a prior run). Writes to the same Turso DB the server reads.
  try {
    process.loadEnvFile(new URL("../../.env", import.meta.url));
    const { prisma } = await import("../../src/lib/prisma.ts");
    const u = await prisma.user.findUnique({ where: { clerkId: "test_user_id" } });
    if (u) {
      await prisma.rewardEvent.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } }); // cascades monster/progress/inventory
    }
    console.log("[reset] test_user_id cleared — fresh run");
  } catch (e) {
    console.log("[reset] skipped (chat+judge still tested):", String(e?.message || e).split("\n")[0]);
  }
}

async function main() {
  const browserType = BROWSER_TYPES[BROWSER_NAME];
  if (!browserType) {
    throw new Error(`Unsupported E2E_BROWSER=${JSON.stringify(BROWSER_NAME)}. Use chromium, firefox, or webkit.`);
  }
  console.log(`E2E_BROWSER=${BROWSER_NAME}`);
  await ensureServer();
  if (STARTUP_ONLY) return;

  await resetTestUser();
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 1200 } });

  // Scope the dev-only header to Academy APIs. Sending it to Clerk's own FAPI
  // requests caused synthetic-session refresh noise and is not needed for pages.
  await context.route("**/api/**", async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), "x-test-bypass": "true" },
    });
  });

  // ENV QUIRK FIX: this headless sandbox rejects Clerk's CDN/FAPI CORS preflight
  // (the OPTIONS gets redirected → "Redirect is not allowed for a preflight request"),
  // which makes @clerk/nextjs' ClerkProvider hard-throw "Failed to load Clerk JS" and
  // blanks the whole React tree before the lesson UI mounts. In a real user's browser
  // this loads fine — it is purely a sandbox networking artifact, NOT an app bug. We
  // proxy Clerk requests through Playwright's node-side fetch (which follows the
  // redirects) and re-emit them same-origin with permissive CORS so Clerk initializes.
  // This does NOT touch the x-test-bypass seam or the /api/chat pipeline under test.
  await context.route(/clerk\.(accounts\.dev|com|dev)/i, async (route) => {
    const req = route.request();
    const origin = req.headers()["origin"] || "http://localhost:3123";
    if (req.method() === "OPTIONS") {
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-credentials": "true",
          "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers":
            req.headers()["access-control-request-headers"] || "*",
        },
        body: "",
      });
    }
    try {
      const resp = await route.fetch({ maxRedirects: 20 });
      const headers = { ...resp.headers() };
      headers["access-control-allow-origin"] = origin;
      headers["access-control-allow-credentials"] = "true";
      const body = await resp.body();
      return route.fulfill({ status: resp.status(), headers, body });
    } catch {
      return route.abort();
    }
  });

  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log("  [browser console.error]", m.text());
  });

  if (WRONG_ANSWER_ONLY) {
    const wrong = await runLesson(page, 1, HARMLESS_WRONG_L1_PROMPT, "L1-wrong");
    await browser.close();
    const passed =
      wrong.error === null &&
      wrong.chat_responded === true &&
      wrong.api?.safetyPassed === true &&
      wrong.api?.challengeCompleted === false &&
      wrong.api?.rewardTotals == null &&
      wrong.reward_modal === false;
    console.log("\n===WRONG_ANSWER_E2E===");
    console.log(JSON.stringify({
      chat: wrong.chat_responded,
      safetyPassed: wrong.api?.safetyPassed,
      challengeCompleted: wrong.api?.challengeCompleted,
      rewardTotals: wrong.api?.rewardTotals,
      rewardModal: wrong.reward_modal,
      error: wrong.error,
    }));
    if (!passed) {
      throw new Error("Harmless wrong answer was blocked, rewarded, or did not receive a chat response.");
    }
    console.log("WRONG_ANSWER_E2E PASSED: harmless wrong answer received pedagogical feedback without a reward ✅");
    return;
  }

  // Full curriculum: drive all five reframed lessons in order. Each correct answer must pass
  // the live judge; completing a lesson advances server progress and unlocks the next.
  const PROMPTS = [
    [1, "храбрый, быстрый, весёлый"],
    [2, "пой весёлые песенки и добавляй огонёк к каждому слову"],
    [3, "заменяй все гласные буквы на звёздочки в каждом слове"],
    [4, "нет, это не кошка, это собака — исправь своё распознавание"],
    [5, "если впереди стена, то поверни налево, иначе иди вперёд по лабиринту"],
  ];
  const results = [];
  for (const [id, prompt] of PROMPTS) {
    results.push(await runLesson(page, id, prompt, `L${id}`));
    // Gap so the reward write (activeStep advance + LessonProgress) commits before the next
    // lesson's page load reads server progress for its unlock gate.
    await sleep(1800);
  }

  await browser.close();

  const summary = results.map((r) => ({
    lesson: r.lesson,
    chat: r.chat_responded,
    judgePass: r.api?.challengeCompleted === true,
    lessonRelevant: r.lesson_relevant,
    rewardModal: r.reward_modal,
    error: r.error,
  }));
  console.log("\n===E2E_SUMMARY===");
  for (const s of summary) {
    console.log(`  L${s.lesson}: chat=${s.chat} judgePass=${s.judgePass} lessonRelevant=${s.lessonRelevant} rewardModal=${s.rewardModal}${s.error ? ` ERROR=${s.error}` : ""}`);
  }
  console.log("\n===E2E_RESULT_JSON===");
  console.log(JSON.stringify(results, null, 2));

  // GATE: every lesson must render a lesson-relevant tutor reply AND pass the judge on the
  // correct answer. A generic safe fallback is still valid only when it is specific to
  // the viewed lesson; this catches cross-lesson personas and generic drift.
  // (Reward modals depend on a fresh test user; reported but not the pass/fail contract, since
  // a provider flap on the modal alone shouldn't fail the run — chat+judge is the contract.)
  const failed = summary.filter((s) => !s.chat || !s.judgePass || !s.lessonRelevant);
  if (failed.length > 0) {
    console.log(`\nE2E FAILED: ${failed.map((s) => `L${s.lesson}`).join(", ")} did not complete the chat, judge, and lesson-relevance gate.`);
    process.exit(1);
  }
  console.log("\nE2E PASSED: all 5 lessons drove lesson-relevant chat + judge in a real browser ✅");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
}).finally(stopServer);
