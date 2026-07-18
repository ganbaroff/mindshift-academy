#!/usr/bin/env node
/**
 * ONE-OFF PROOF (not part of the suite): does each REWRITTEN lesson's correct answer
 * PASS the REAL child-safety filter (src/lib/moderation.ts) against LIVE NVIDIA?
 *
 * - Calls the REAL moderate() N times per lesson (exposes 8b flakiness).
 * - ALSO isolates llama-guard-4-12b directly (deterministic PRIMARY guard) so we can
 *   report the llama-guard verdict separately from the flaky kidNet 8b verdict.
 * - Runs the OLD lesson-5 battle prompt through llama-guard as a BEFORE/AFTER control
 *   to prove the deterministic "unsafe s1" block is gone on the new puzzle theme.
 * Writes nothing. Touches no product source.
 */
process.loadEnvFile(new URL("../.env", import.meta.url));

const { moderate } = await import("../src/lib/moderation.ts");
const { getAIClient } = await import("../src/lib/ai-provider.ts");
const { getLesson } = await import("../src/lib/curriculum.ts");

const GUARD_MODEL = "meta/llama-guard-4-12b";
const N = 5; // samples per lesson to expose flakiness

const ai = getAIClient();
if (!ai) {
  console.error("No AI client — cannot run live probe.");
  process.exit(2);
}

// The rewritten correct answers — same strings the suite uses.
const CORRECT = {
  1: "Мой монстр храбрый, быстрый и весёлый",
  2: "Пой весёлые песенки и говори восторженно, добавляй огонёк 🔥 к каждому слову",
  3: "Заменяй все гласные буквы на звёздочки в каждом слове",
  4: "Нет, это не кошка, это собака — исправь своё распознавание",
  5: "Если впереди стена, то поверни налево, иначе иди вперёд по лабиринту",
};

// Representative OLD lesson-5 battle prompt (the theme we removed) — control only.
const OLD_L5_BATTLE = "Атакуй босса Bugzilla мечом! Если HP врага больше 50, нанеси удар и отними урон, иначе используй огненную атаку и победи его";

// Isolate llama-guard exactly as moderation.ts does (single user msg, max_tokens 30, temp 0).
async function guardOnly(text) {
  try {
    const r = await ai.client.chat.completions.create(
      { model: GUARD_MODEL, messages: [{ role: "user", content: text }], max_tokens: 30, temperature: 0 },
      { timeout: 8000 }
    );
    const out = (r.choices[0]?.message?.content || "").trim().toLowerCase();
    return { blocked: out.startsWith("unsafe"), raw: out.replace(/\s+/g, " ").slice(0, 40) };
  } catch (e) {
    return { error: true, name: e?.name, msg: String(e?.message || "").slice(0, 60) };
  }
}

function pct(n, d) { return d ? Math.round((100 * n) / d) : 0; }

const summary = {};
for (const lesson of [1, 2, 3, 4, 5]) {
  const text = CORRECT[lesson];
  // (1) llama-guard isolated, N times
  let guardBlocked = 0, guardErr = 0;
  const guardRaws = new Set();
  for (let i = 0; i < N; i++) {
    const g = await guardOnly(text);
    if (g.error) guardErr++;
    else { if (g.blocked) guardBlocked++; guardRaws.add(g.raw || "safe"); }
  }
  // (2) full moderate() (llama-guard + kidNet combined), N times — records WHICH source blocks
  let modSafe = 0, modBlocked = 0, modFailClosed = 0;
  const bySource = {};
  for (let i = 0; i < N; i++) {
    const m = await moderate(ai.client, ai.model, text);
    if (m.source === "fail-closed") modFailClosed++;
    else if (m.safe) modSafe++;
    else { modBlocked++; bySource[m.source] = (bySource[m.source] || 0) + 1; bySource[`${m.source}:${m.category}`] = (bySource[`${m.source}:${m.category}`] || 0) + 1; }
  }
  // kidNet-attributable blocks = full-moderate blocks whose source is kid-net
  const kidBlocks = bySource["kid-net"] || 0;
  summary[lesson] = {
    title: getLesson(lesson)?.title,
    llamaGuard: `${N - guardBlocked - guardErr}/${N} pass` + (guardBlocked ? `, ${guardBlocked} BLOCK` : "") + (guardErr ? `, ${guardErr} err` : "") + ` [${[...guardRaws].join("|")}]`,
    llamaGuardPassRate: pct(N - guardBlocked - guardErr, N),
    moderateFull: `${modSafe}/${N} safe, ${modBlocked} block, ${modFailClosed} fail-closed`,
    kidNetBlocks: kidBlocks,
    blockSources: bySource,
  };
  console.log(`L${lesson} "${getLesson(lesson)?.title}" :: input="${text}"`);
  console.log(`   llama-guard: ${summary[lesson].llamaGuard}`);
  console.log(`   moderate()  : ${summary[lesson].moderateFull}  sources=${JSON.stringify(bySource)}`);
}

// BEFORE/AFTER control on llama-guard for lesson 5.
console.log("\n==== LESSON-5 llama-guard BEFORE/AFTER (deterministic control) ====");
let oldBlocked = 0, newBlocked = 0;
const oldRaws = new Set(), newRaws = new Set();
for (let i = 0; i < N; i++) {
  const o = await guardOnly(OLD_L5_BATTLE); if (!o.error) { if (o.blocked) oldBlocked++; oldRaws.add(o.raw); }
  const n = await guardOnly(CORRECT[5]);   if (!n.error) { if (n.blocked) newBlocked++; newRaws.add(n.raw); }
}
console.log(`OLD battle prompt : ${oldBlocked}/${N} BLOCKED by llama-guard [${[...oldRaws].join("|")}]`);
console.log(`NEW quest  prompt : ${newBlocked}/${N} BLOCKED by llama-guard [${[...newRaws].join("|")}]`);
const lesson5_llamaguard_fixed = newBlocked === 0;
console.log(`lesson5_llamaguard_fixed = ${lesson5_llamaguard_fixed} (new prompt not blocked by deterministic guard)`);

console.log("\nJSON_PROBE_BEGIN");
console.log(JSON.stringify({ N, summary, old_l5_guard_blocked: oldBlocked, new_l5_guard_blocked: newBlocked, lesson5_llamaguard_fixed }));
console.log("JSON_PROBE_END");
