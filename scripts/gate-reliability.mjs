#!/usr/bin/env node
/**
 * RELIABILITY GATE — run the FULL child chat loop (input-moderation -> judge -> tutor ->
 * output-moderation) N times for a GOOD lesson message, exactly as route.ts does, on the
 * Gemini chat client + NVIDIA guard. Report any timeout/flap (fail-closed on input, judge
 * keyword-fallback, tutor timeout, output fail-closed). Measure per-message wall-clock.
 * Read-only. No secrets printed.
 */
process.loadEnvFile(new URL("../.env", import.meta.url));

const { getLesson } = await import("../src/lib/curriculum.ts");
const { moderate } = await import("../src/lib/moderation.ts");
const { getGuardClient, getChatClient } = await import("../src/lib/ai-provider.ts");
const { minimizeChildText } = await import("../src/lib/privacy.ts");

const chat = getChatClient();
const guardClient = getGuardClient();
if (!chat) { console.error("No chat client"); process.exit(2); }

const GOOD = {
  1: "Мой монстр храбрый, быстрый и весёлый",
  2: "Пой весёлые песенки и говори восторженно, добавляй огонёк 🔥 к каждому слову",
  3: "Заменяй все гласные буквы на звёздочки в каждом слове",
  4: "Нет, это не кошка, это собака — исправь своё распознавание",
  5: "Если впереди стена, то поверни налево, иначе иди вперёд по лабиринту",
};

function buildSys(stepId) {
  const persona = getLesson(stepId)?.systemPrompt ?? null;
  const base = `Ты - дружелюбный напарник по обучению программированию для ребенка 9-14 лет. Облик: "Огненный Искра". Отвечай коротко, по-русски, используй эмодзи. Не говори на взрослые темы/политику/насилие.`;
  return persona ? `${base}\nРОЛЬ УРОКА:\n${persona}` : base;
}

async function judge(stepId, prompt) {
  const rubric = getLesson(stepId)?.rubric;
  try {
    const j = await chat.client.chat.completions.create({
      model: chat.model, max_tokens: 120, temperature: 0, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: 'Строгий добрый проверяющий. Верни JSON {"pass":true|false,"reason":"..."}. pass:true только если ребёнок реально выполнил суть задания.' },
        { role: "user", content: `Критерий: ${rubric}\n\nСообщение: "${prompt}"` },
      ],
    }, { timeout: 6000 });
    const d = JSON.parse(j.choices[0]?.message?.content || "{}");
    return { pass: d.pass === true, fellBack: false };
  } catch (e) { return { pass: false, fellBack: true, err: e?.name }; }
}

async function tutor(stepId, prompt) {
  const r = await chat.client.chat.completions.create({
    model: chat.model,
    messages: [{ role: "system", content: buildSys(stepId) }, { role: "user", content: minimizeChildText(prompt) }],
    max_tokens: 150, temperature: 0.7,
  }, { timeout: 8000 });
  return r.choices[0]?.message?.content || "";
}

const N = 8;
const times = [];
const flaps = [];
let clean = 0;
for (let i = 0; i < N; i++) {
  const lesson = (i % 5) + 1;
  const prompt = GOOD[lesson];
  const t0 = Date.now();
  let issue = null;
  try {
    const inMod = await moderate(guardClient ?? chat.client, chat.client, chat.model, minimizeChildText(prompt));
    if (!inMod.safe) issue = `input-blocked(${inMod.source})`;
    let v = { pass: false, fellBack: false };
    if (!issue) { v = await judge(lesson, minimizeChildText(prompt)); if (v.fellBack) issue = `judge-fellback(${v.err})`; else if (!v.pass) issue = "judge-failed-good"; }
    let reply = "";
    if (!issue) { try { reply = await tutor(lesson, prompt); } catch (e) { issue = `tutor-timeout(${e?.name})`; } }
    let outMod = { safe: true, source: "" };
    if (!issue && reply) { outMod = await moderate(guardClient ?? chat.client, chat.client, chat.model, reply); if (!outMod.safe) issue = `output-blocked(${outMod.source})`; }
  } catch (e) { issue = `threw(${e?.name})`; }
  const ms = Date.now() - t0;
  times.push(ms);
  if (issue) flaps.push({ run: i, lesson, issue, ms }); else clean++;
  console.log(`run#${i} L${lesson} ${ms}ms ${issue ? "FLAP:" + issue : "OK"}`);
}

times.sort((a, b) => a - b);
const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
const p50 = times[Math.floor(times.length / 2)];
const max = times[times.length - 1];
console.log(`\n==== RELIABILITY ====`);
console.log(`runs=${N} clean=${clean} flaps=${flaps.length} avg=${avg}ms p50=${p50}ms max=${max}ms`);
console.log(`flaps=${JSON.stringify(flaps)}`);
console.log("JSON_REL_BEGIN");
console.log(JSON.stringify({ runs: N, clean, flaps, avgMs: avg, p50Ms: p50, maxMs: max }));
console.log("JSON_REL_END");
