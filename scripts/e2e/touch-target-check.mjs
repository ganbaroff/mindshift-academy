// Measures real touch targets in a real browser at 320px — the width the brief calls
// "a real device, not an edge case". Static class greps cannot prove a rendered size.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";

const root = process.cwd();
const MIN = 44;
const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const dbDir = mkdtempSync(join(tmpdir(), "touch-"));
const dbUrl = `file:${join(dbDir, "t.db").replaceAll("\\", "/")}`;
await new Promise((res, rej) => { const c = spawn(process.execPath, [join(root, "node_modules/prisma/build/index.js"), "db", "push"], { cwd: root, env: { ...process.env, DATABASE_URL: dbUrl, TURSO_DATABASE_URL: dbUrl }, stdio: "ignore" }); c.on("exit", (x) => (x === 0 ? res() : rej(new Error("db push " + x)))); });
const srv = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", String(port)], { cwd: root, env: { ...process.env, DATABASE_URL: dbUrl, TURSO_DATABASE_URL: dbUrl, FAKE_AI: "1", FAKE_AI_MODE: "tutor_down", NEXT_PUBLIC_UX_V11: "1" }, stdio: ["ignore", "pipe", "pipe"] });
let out = "";
await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("ready timeout: " + out.slice(-800))), 120000); const c = (d) => { out += d; if (/Ready in/.test(out)) { clearTimeout(t); res(); } }; srv.stdout.on("data", c); srv.stderr.on("data", c); });

const base = `http://localhost:${port}`;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 320, height: 780 }, reducedMotion: "reduce" });
await ctx.route("**/*", async (route) => { const h = route.request().headers(); h["x-test-bypass"] = "true"; await route.continue({ headers: h }); });
const page = await ctx.newPage();
await page.goto(`${base}/enter-code`, { waitUntil: "domcontentloaded" });
await page.getByLabel("Символ 1").waitFor({ timeout: 30000 });

const boxes = [];
for (let i = 1; i <= 8; i += 1) boxes.push(await page.getByLabel(`Символ ${i}`).boundingBox());
const tooSmall = boxes.filter((b) => !b || b.width < MIN || b.height < MIN);
assert.equal(tooSmall.length, 0, `code boxes under ${MIN}px: ${JSON.stringify(tooSmall)}`);
console.log(`PASS  8 code boxes at ${Math.round(boxes[0].width)}x${Math.round(boxes[0].height)}px (min ${MIN})`);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert.equal(overflow, 0, `320px viewport scrolls horizontally by ${overflow}px`);
console.log("PASS  no horizontal overflow at 320px");

await page.screenshot({ path: join(root, "plans/enter-code-320px.png"), fullPage: true });

// The session screen: every control a child touches, measured at 320px.
await page.goto(`${base}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
await page.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 30000 });
const small = await page.evaluate((min) => {
  const out = [];
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea, summary")) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.pointerEvents === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.width < min || r.height < min) {
      out.push({ tag: el.tagName.toLowerCase(), label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  return out;
}, MIN);
for (const s of small) console.log("   ", `${s.w}x${s.h}`, s.tag, JSON.stringify(s.label));
assert.equal(small.length, 0, `${small.length} controls under ${MIN}px on the session screen`);
console.log(`PASS  session screen: every control >= ${MIN}px`);
const sessionOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert.equal(sessionOverflow, 0, `session screen scrolls horizontally by ${sessionOverflow}px`);
console.log("PASS  session screen: no horizontal overflow at 320px");
await page.screenshot({ path: join(root, "plans/session-320px.png"), fullPage: true });

await browser.close();
srv.kill();
console.log("TOUCH TARGET CHECK: all passed");
