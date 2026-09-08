#!/usr/bin/env node
/**
 * The design system's only enforcement point.
 *
 * Two assertions, both of which have already failed in this repository's history:
 *
 *   1. `src/lib/design/tokens.ts` and `src/app/globals.css` agree. A hand-copied mirror with
 *      nothing checking it is how `docs/design-handoff/v1.1/03-TOKENS.css` — which states it
 *      was "copied from src/app/globals.css on 2026-08-07" — quietly went stale.
 *
 *   2. No component writes a raw colour. The retired dark theme's palette lived on inside
 *      components for a month after the product moved to cream paper: violet #8b5cf6 as the
 *      companion's default, #06b6d4 / #ec4899 / #10b981 as the four skin choices, plus
 *      Tailwind's own `violet-500`, `cyan-400` and `amber-400`. None of it was visible to any
 *      test, because a colour in a className is just a string.
 *
 * No network, no browser, no database.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

const ROOT = process.cwd();
let failed = 0;
const fail = (line) => {
  failed += 1;
  console.log(`  FAIL  ${line}`);
};
const pass = (line) => console.log(`  PASS  ${line}`);

// ── 1. tokens.ts vs globals.css ───────────────────────────────────────────────
const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
const ts = readFileSync(join(ROOT, "src/lib/design/tokens.ts"), "utf8");

/** Last definition wins, exactly as the cascade resolves it. */
const cssTokens = new Map();
for (const m of css.matchAll(/^\s+(--[a-z0-9-]+):\s*([^;]+);/gim)) {
  cssTokens.set(m[1], m[2].trim());
}

const tsTokens = new Map();
for (const m of ts.matchAll(/"(--[a-z0-9-]+)":\s*"([^"]+)"/g)) {
  tsTokens.set(m[1], m[2].trim());
}

if (tsTokens.size === 0) fail("tokens.ts exports no tokens — the parser or the file is wrong");

let drift = 0;
for (const [name, value] of tsTokens) {
  const inCss = cssTokens.get(name);
  if (inCss === undefined) {
    fail(`${name} is declared in tokens.ts but not in globals.css`);
    drift += 1;
  } else if (inCss !== value) {
    fail(`${name} drifted — globals.css says "${inCss}", tokens.ts says "${value}"`);
    drift += 1;
  }
}
if (drift === 0) pass(`${tsTokens.size} tokens match globals.css exactly`);

// ── 2. no raw colours in components ───────────────────────────────────────────
/** Tailwind's default palette. Ours is declared in globals.css and reached through var(). */
const DEAD_PALETTE =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|decoration|accent|caret|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const RAW_HEX = /#[0-9A-Fa-f]{6}\b/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Registered debt, the same two-sided ratchet `tests/curriculum-variety.test.mjs` uses for
 * content. These files carried the dead palette before the guard existed. A file listed here
 * may keep its offences; a file NOT listed may not add one; and a listed file that has become
 * clean fails the run until it is removed from the list, so nobody can quietly fix a file and
 * leave the guard protecting nothing. The list may only shrink.
 *
 * Every one of these is a legacy or adult-facing surface. The child's task surfaces —
 * DisplayGrid, GridDrawSurface, RuleSurface, WorkedExample — were cleaned in the same change
 * that added this test, which is why they are absent.
 */
const DEBT_FILES = new Set([
  "src/components/chat/ChatWindow.tsx",
  "src/components/chat/PromptInput.tsx",
  "src/components/chat/SafeProxyVisualizer.tsx",
  "src/components/companion/MonsterSVG.tsx",
  "src/components/dashboard/DashboardMonster.tsx",
  "src/components/dashboard/InventoryGrid.tsx",
  "src/components/gamification/AchievementGrid.tsx",
  "src/components/gamification/UnitEconomicsBar.tsx",
  "src/components/lesson/Syllabus.tsx",
  "src/components/lesson/VideoSimulator.tsx",
  "src/components/modals/MonsterCard.tsx",
]);

const files = walk(join(ROOT, "src/components"));
const debtSeen = new Set();
let offences = 0;
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // A comment explaining which dead colour was removed must not itself trip the guard.
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    const code = line.replace(/\/\/.*$/, "");
    const rel = file.slice(ROOT.length + 1).split(sep).join("/");
    const hit =
      (RAW_HEX.test(code) && "writes a raw hex colour") ||
      (DEAD_PALETTE.test(code) && "uses Tailwind's default palette");
    if (!hit) return;
    offences += 1;
    if (DEBT_FILES.has(rel)) {
      debtSeen.add(rel);
      return;
    }
    fail(`${rel}:${i + 1} ${hit} — the product's colours live in globals.css, reached by var()`);
  });
}

for (const registered of DEBT_FILES) {
  if (!debtSeen.has(registered)) {
    fail(
      `${registered} is registered as colour debt but is now clean — remove it from DEBT_FILES in this same change, or the guard protects nothing`
    );
  }
}

console.log(
  `  ДОЛГ  ${offences} raw colours in ${debtSeen.size} registered files; ` +
    `${files.length - debtSeen.size} of ${files.length} component files are clean`
);

console.log(
  `\nDESIGN TOKENS: ${failed === 0 ? "all passed" : "FAILURES"} (${failed} failed)`
);
process.exit(failed === 0 ? 0 : 1);
