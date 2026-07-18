// End-to-end proof: drive the reframed child lessons in a REAL Chromium via Playwright,
// using ONLY the dev-only x-test-bypass seam (no Clerk password). Runs the REAL Gemini
// pipeline (moderation + judge + tutor). Screenshots saved next to this file.
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || "http://localhost:3123";
const INPUT_SEL = 'textarea[aria-label="Напиши промпт для питомца"]';
const SEND_SEL = 'button:has-text("Отправить промпт")';
const LOG_SEL = '[role="log"][aria-label="Чат с питомцем"]';
const MODAL_SEL = '[role="dialog"][aria-labelledby="reward-modal-title"]';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    api: null,
    reward_modal: false,
    modal_desc: "",
    screenshot_path: path.join(__dirname, `l${lessonId}.png`),
    error: null,
  };

  // Capture the authoritative /api/chat server response for this lesson.
  let apiBody = null;
  const onResp = async (resp) => {
    try {
      if (resp.url().includes("/api/chat") && resp.request().method() === "POST") {
        apiBody = await resp.json();
      }
    } catch {}
  };
  page.on("response", onResp);

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

    result.chat_responded = replied && !!apiBody;
    result.api = apiBody;

    // Reward / completion modal.
    const modal = await page.$(MODAL_SEL);
    if (modal) {
      result.reward_modal = true;
      result.modal_desc = (await page.textContent(MODAL_SEL))?.replace(/\s+/g, " ").trim() || "";
    }

    await page.screenshot({ path: result.screenshot_path, fullPage: true });
    console.log(`[${label}] reply="${result.tutor_reply}"`);
    console.log(`[${label}] api.challengeCompleted=${apiBody?.challengeCompleted} rewardTotals=${JSON.stringify(apiBody?.rewardTotals)} judge="${apiBody?.judgeReason || ""}"`);
    console.log(`[${label}] reward_modal=${result.reward_modal} desc="${result.modal_desc}"`);
  } catch (e) {
    result.error = String(e?.message || e);
    console.log(`[${label}] ERROR: ${result.error}`);
    try { await page.screenshot({ path: result.screenshot_path, fullPage: true }); } catch {}
  } finally {
    page.off("response", onResp);
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

(async () => {
  await resetTestUser();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: { "x-test-bypass": "true" },
    viewport: { width: 1366, height: 1200 },
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
    } catch (e) {
      return route.abort();
    }
  });

  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log("  [browser console.error]", m.text());
  });

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
    rewardModal: r.reward_modal,
    error: r.error,
  }));
  console.log("\n===E2E_SUMMARY===");
  for (const s of summary) {
    console.log(`  L${s.lesson}: chat=${s.chat} judgePass=${s.judgePass} rewardModal=${s.rewardModal}${s.error ? ` ERROR=${s.error}` : ""}`);
  }
  console.log("\n===E2E_RESULT_JSON===");
  console.log(JSON.stringify(results, null, 2));

  // GATE: every lesson must render a tutor reply AND pass the judge on the correct answer.
  // (Reward modals depend on a fresh test user; reported but not the pass/fail contract, since
  // a provider flap on the modal alone shouldn't fail the run — chat+judge is the contract.)
  const failed = summary.filter((s) => !s.chat || !s.judgePass);
  if (failed.length > 0) {
    console.log(`\nE2E FAILED: ${failed.map((s) => `L${s.lesson}`).join(", ")} did not complete chat+judge.`);
    process.exit(1);
  }
  console.log("\nE2E PASSED: all 5 lessons drove chat + judge in a real browser ✅");
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
