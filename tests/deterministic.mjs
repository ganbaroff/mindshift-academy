#!/usr/bin/env node
/**
 * DETERMINISTIC test lane — the reliable `npm test` gate.
 *
 * Pure and self-contained: NO dev server, NO live LLM provider, NO database. Every assertion
 * is a function of source code + fixed inputs, so it runs in well under a second and can NEVER
 * hang or flap. This is the CI gate. The flaky, provider-dependent safety checks live in the
 * SEPARATE live lane (tests/safety.test.mjs, `npm run test:live`) with a hard deadline.
 *
 * Covers:
 *   P0-PRIV  /api/generate-silhouette egresses NOTHING pre-consent (static import guard) and
 *            its deterministic output never echoes the raw child words.
 *   STATE    progression seams — lock/unlock, reward-map drift, modal-on-replay, reconcile.
 *   SAFETY   moderate() fails CLOSED when a classifier throws (the sacred branch), via a mock.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..");

let pass = 0;
let fail = 0;
const fails = [];
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    fails.push(name);
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

// ---- P0-PRIV: static no-egress guard on the silhouette route ----
console.log("=== P0-PRIV: silhouette route has NO external-AI egress ===");
const silRoute = readFileSync(join(root, "src/app/api/generate-silhouette/route.ts"), "utf8");
const forbidden = ["ai-provider", "getAIClient", "@/lib/moderation", 'from "openai"', "from 'openai'"];
for (const f of forbidden) {
  check(`route does not reference ${f}`, !silRoute.includes(f), `(found "${f}" — a possible egress path!)`);
}

// ---- P0-PRIV: deterministic silhouette (pure fn, no network) ----
const { deterministicSilhouette } = await import("../src/lib/silhouette.ts");
const words = ["храбрый", "быстрый", "весёлый"];
const a = deterministicSilhouette(words);
const b = deterministicSilhouette(words);
check("same words -> identical output (deterministic)", JSON.stringify(a) === JSON.stringify(b));
check("output has {name,emoji,color,description}", Boolean(a.name && a.emoji && a.color && a.description));
const abusive = ["убей", "всех", "детей"];
const out = JSON.stringify(deterministicSilhouette(abusive)).toLowerCase();
const echoed = abusive.some((word) => out.includes(word));
check("abusive words are NOT echoed back in the response", !echoed, `(echoed input: ${out})`);

// ---- STATE: progression seams (pure) ----
console.log("=== STATE: progression seams ===");
const { deriveLockState, modalShouldOpen, completedLessonIdsFromUser, stepReward } = await import(
  "../src/lib/progression.ts"
);
const { getLesson } = await import("../src/lib/curriculum.ts");
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);

check("modal-on-replay stays shut (challengeCompleted but no grant)", modalShouldOpen(true, null) === false);
check("modal-on-real-grant opens", modalShouldOpen(true, { xp: 100, crystals: 10 }) === true);

const payload = { progress: [1, 2, 3].map((o) => ({ completed: true, lesson: { order: o } })) };
check("reconcile rebuilds completed set from server truth", eq(completedLessonIdsFromUser(payload), [1, 2, 3]));

const locks = deriveLockState([1, 2, 3, 4], 1);
check("backward-nav keeps later lessons unlocked", [2, 3, 4].every((id) => locks[id] !== "locked"));

const drift = [];
for (let l = 1; l <= 5; l += 1) {
  const r = stepReward(l);
  const lesson = getLesson(l);
  const wantNext = Math.min(l + 1, 5);
  if (!r || !lesson || r.xp !== lesson.reward.xp || r.crystals !== lesson.reward.crystals || r.next !== wantNext) {
    drift.push(`L${l}`);
  }
}
check("reward map matches curriculum (no drift)", drift.length === 0, `(drift: ${drift.join(",")})`);

// ---- SAFETY: fail-closed moderation (mock, no live call) ----
console.log("=== SAFETY: moderate() fails CLOSED on classifier error ===");
const { moderate } = await import("../src/lib/moderation.ts");
const throwing = { chat: { completions: { create: async () => { throw new Error("simulated outage"); } } } };
const r = await moderate(throwing, throwing, "gemini-2.5-flash", "любой безобидный текст");
check(
  "classifier outage -> fail-closed BLOCK",
  r.safe === false && r.source === "fail-closed",
  `(safe=${r.safe} source=${r.source})`
);

// ---- totals ----
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("FAILED:", fails.join(", "));
  process.exit(1);
}
console.log("ALL DETERMINISTIC TESTS PASSED ✅");
