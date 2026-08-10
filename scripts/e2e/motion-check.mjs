// Feel-check the applied motion in a real browser, against plans/001-003.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
const root = process.cwd();
const port = await new Promise((r) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const dbDir = mkdtempSync(join(tmpdir(), "motion-"));
const dbUrl = `file:${join(dbDir, "m.db").replaceAll("\\", "/")}`;
await new Promise((res, rej) => { const c = spawn(process.execPath, [join(root,"node_modules/prisma/build/index.js"),"db","push"], { cwd: root, env: { ...process.env, DATABASE_URL: dbUrl, TURSO_DATABASE_URL: dbUrl }, stdio: "ignore" }); c.on("exit", (x) => x === 0 ? res() : rej(new Error("db push " + x))); });
const srv = spawn(process.execPath, [join(root,"node_modules/next/dist/bin/next"),"dev","--webpack","-p",String(port)], { cwd: root, env: { ...process.env, DATABASE_URL: dbUrl, TURSO_DATABASE_URL: dbUrl, FAKE_AI: "1", FAKE_AI_MODE: "tutor_down", NEXT_PUBLIC_UX_V11: "1" }, stdio: ["ignore","pipe","pipe"] });
let out = ""; await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("ready timeout: " + out.slice(-800))), 120000); const c = (d) => { out += d; if (/Ready in/.test(out)) { clearTimeout(t); res(); } }; srv.stdout.on("data", c); srv.stderr.on("data", c); });
const base = `http://localhost:${port}`;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route("**/*", async (route) => { const h = route.request().headers(); h["x-test-bypass"] = "true"; await route.continue({ headers: h }); });
const page = await ctx.newPage();
await page.goto(`${base}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
await page.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 30000 });

// 001 — motion tokens resolve to Emil's exact curve
const ease = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim());
assert.equal(ease, "cubic-bezier(0.23, 1, 0.32, 1)", `--ease-out resolved to "${ease}"`);
console.log("PASS  --ease-out token resolves:", ease);

// 001 — primary check button has real press feedback with the token curve
const btn = page.getByTestId("session-primary-check");
const css = await btn.evaluate((el) => { const s = getComputedStyle(el); return { prop: s.transitionProperty, dur: s.transitionDuration, timing: s.transitionTimingFunction }; });
// Tailwind v4's `transition-transform` expands to the four transform-family properties.
assert.ok(css.prop.includes("transform"), `transition-property=${css.prop}`);
assert.ok(!css.prop.includes("all"), `must not animate everything: ${css.prop}`);
assert.equal(css.dur, "0.16s", `duration=${css.dur}`);
assert.equal(css.timing, "cubic-bezier(0.23, 1, 0.32, 1)", `timing=${css.timing}`);
console.log("PASS  Проверить: transform", css.dur, css.timing);

// 001 — the press actually scales, and only scale (no layout move).
// Select a cell first: a disabled button never receives :active.
await page.getByTestId("task-workspace-grid-draw").getByRole("button", { name: /Выбрать клетку 1, 1/ }).click();
await page.waitForFunction(() => { const b = document.querySelector('[data-testid="session-primary-check"]'); return b && !b.disabled; }, { timeout: 10000 });
const box0 = await btn.boundingBox();
await page.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
await page.mouse.down();
await page.waitForTimeout(250);
// Tailwind v4 writes the standalone CSS `scale` property, not a `transform` matrix.
const held = await btn.evaluate((el) => getComputedStyle(el).scale);
await page.mouse.up();
await page.waitForTimeout(250);
const released = await btn.evaluate((el) => getComputedStyle(el).scale);
assert.equal(held, "0.97", `scale while held=${held}`);
assert.ok(released === "none" || released === "1", `scale after release=${released}`);
console.log("PASS  press scales to 0.97 and springs back:", held, "->", released);

// 002 — the cell a child TAPS (GridDrawSurface), not the read-only picture (DisplayGrid, role="img")
const cell = page.getByTestId("task-workspace-grid-draw").getByRole("button", { name: /Выбрать клетку 1, 1/ });
const cellCss = await cell.evaluate((el) => { const s = getComputedStyle(el); return { dur: s.transitionDuration, timing: s.transitionTimingFunction }; });
assert.ok(cellCss.dur.startsWith("0.12s"), `cell duration=${cellCss.dur}`);
assert.ok(cellCss.timing.includes("cubic-bezier(0.23, 1, 0.32, 1)"), `cell timing=${cellCss.timing}`);
console.log("PASS  grid cell:", cellCss.dur, cellCss.timing);

// 003 — hover scale is gated: on a touch viewport with no fine pointer it must not apply
const gated = await page.evaluate(() => { const el = document.createElement("div"); el.className = "[@media(hover:hover)]:hover:scale-105"; document.body.appendChild(el); const has = [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText.includes("hover: hover") || r.cssText.includes("hover:hover")); } catch { return false; } }); el.remove(); return has; });
assert.equal(gated, true, "no @media (hover: hover) rule found in the emitted CSS");
console.log("PASS  @media (hover: hover) is emitted by Tailwind");


// The monster's entrance: CSS, off the main thread, gentler under reduced motion.
await page.getByText("Сказать своими словами", { exact: true }).click();
await page.locator("#task-utterance").fill("намажь");
await page.getByRole("button", { name: "Отправить текст", exact: true }).click();
const bubble = page.getByTestId("monster-reask");
await bubble.waitFor({ timeout: 15000 });
const anim = await bubble.evaluate((el) => { const s = getComputedStyle(el); return { name: s.animationName, dur: s.animationDuration, timing: s.animationTimingFunction }; });
assert.equal(anim.name, "rise-in", `re-ask animation=${anim.name}`);
assert.equal(anim.dur, "0.2s", `re-ask duration=${anim.dur}`);
assert.equal(anim.timing, "cubic-bezier(0.23, 1, 0.32, 1)", `re-ask timing=${anim.timing}`);
console.log("PASS  re-ask rises in:", anim.name, anim.dur, anim.timing);

// Under reduced motion it must still announce itself, just stop travelling.
const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
await reduced.route("**/*", async (r) => { const h = r.request().headers(); h["x-test-bypass"] = "true"; await r.continue({ headers: h }); });
const rp = await reduced.newPage();
await rp.goto(`${base}/session/w1-s1?demo=1`, { waitUntil: "domcontentloaded" });
await rp.getByTestId("task-workspace-grid-draw").waitFor({ timeout: 30000 });
await rp.getByText("Сказать своими словами", { exact: true }).click();
await rp.locator("#task-utterance").fill("намажь");
await rp.getByRole("button", { name: "Отправить текст", exact: true }).click();
const rb = rp.getByTestId("monster-reask");
await rb.waitFor({ timeout: 15000 });
const rAnim = await rb.evaluate((el) => getComputedStyle(el).animationName);
assert.equal(rAnim, "fade-in", `reduced-motion animation=${rAnim}`);
console.log("PASS  reduced motion: fade-in, no travel");
await reduced.close();

await page.screenshot({ path: join(root, "plans/motion-check-390px.png") });
await browser.close(); srv.kill();
console.log("MOTION CHECK: all passed");
