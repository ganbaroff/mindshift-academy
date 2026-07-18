// LIVE proof of the lesson-1 anti-hallucination fix against REAL NVIDIA.
// NOTE: the prod-configured tutor model meta/llama-3.1-8b-instruct (and ALL meta
// llama instruct models) are TIMING OUT on this NVIDIA NIM tier right now (verified:
// 4/4 timeouts at 20-30s; only llama-guard-4-12b responds). So this harness drives a
// DIFFERENT, currently-reachable real NVIDIA model — nvidia/nemotron-mini-4b-instruct —
// purely to observe the guardrail's behavioral effect live. moderation.ts is imported
// UNMODIFIED. We run the BAD input with the CURRENT (fixed) prompt AND with a synthetic
// "before" prompt (guardrail paragraph stripped, in-harness only) to show the contrast.
import "dotenv/config";
import { moderate } from "../src/lib/moderation.ts";
import { getAIClient } from "../src/lib/ai-provider.ts";
import { getLesson } from "../src/lib/curriculum.ts";
import { minimizeChildText } from "../src/lib/privacy.ts";

const SUB_MODEL = "nvidia/nemotron-mini-4b-instruct";
const client = getAIClient().client;
console.log("SUBSTITUTE tutor/judge model (prod 8b is down):", SUB_MODEL);

async function judge(prompt, stepId) {
  const rubric = getLesson(stepId)?.rubric;
  const j = await client.chat.completions.create({
    model: SUB_MODEL, max_tokens: 120, temperature: 0, response_format: { type: "json_object" },
    messages: [
      { role: "system", content:
        "Ты — строгий, но добрый проверяющий в детской академии промпт-инжиниринга. " +
        "Тебе дают критерий урока и сообщение ребёнка. Верни СТРОГО JSON вида " +
        '{"pass": true|false, "reason": "одно короткое доброе предложение по-русски"}. ' +
        "Засчитывай (pass:true) ТОЛЬКО если ребёнок реально выполнил суть задания. " +
        "Бессмысленное, не по теме или лишь формально содержащее ключевое слово сообщение — pass:false. Сомневаешься — pass:false." },
      { role: "user", content: `Критерий урока: ${rubric}\n\nСообщение ребёнка: "${prompt}"` },
    ],
  }, { timeout: 15000 });
  const d = JSON.parse(j.choices[0]?.message?.content || "{}");
  return { pass: d.pass === true, reason: typeof d.reason === "string" ? d.reason : "" };
}

async function tutor(userText, personaOverride) {
  const persona = personaOverride ?? getLesson(1).systemPrompt;
  const base = `
      Ты - дружелюбный, воодушевляющий игровой напарник по обучению программированию для ребенка 9-14 лет.
      Сейчас ты отыгрываешь облик: "🥚 Малыш-Дракончик".

      ТВОИ ПРАВИЛА:
      1. Отвечай коротко - максимум 2-3 предложения. Язык общения: русский.
      2. Веди себя в соответствии со своей ролью. Используй эмодзи.
      3. Никогда не говори на взрослые темы, политику, религию, насилие.
      4. Помогай ребенку с заданиями, но не давай готовое решение сразу.
      5. Если ребенок попросил тебя шифровать слова (Шаг 3), выполняй его инструкции.
    `;
  const system = `${base}\n      РОЛЬ ТЕКУЩЕГО УРОКА (отыгрывай её ПОВЕРХ облика, но НЕ нарушая правил безопасности выше):\n      ${persona}\n    `;
  const r = await client.chat.completions.create({
    model: SUB_MODEL, max_tokens: 150, temperature: 0.7,
    messages: [{ role: "system", content: system }, { role: "user", content: minimizeChildText(userText) }],
  }, { timeout: 15000 });
  return r.choices[0]?.message?.content || "";
}

async function run(label, userText, { personaOverride = null, activeStepId = 1, serverStep = 1 } = {}) {
  console.log(`\n===== ${label} =====`);
  console.log("child message:", JSON.stringify(userText));
  const inMod = await moderate(client, SUB_MODEL, userText);
  // NOTE: kidNet here runs on the weak SUBSTITUTE model and false-blocks even safe input;
  // in prod (real 8b) this input passed. We log it but PROCEED to observe the tutor guardrail.
  console.log("INPUT moderation (substitute-classifier, unreliable):", JSON.stringify(inMod));
  const verdict = await judge(minimizeChildText(userText), serverStep);
  console.log("JUDGE verdict:", JSON.stringify(verdict));
  let reward = null;
  if (verdict.pass && serverStep === activeStepId) {
    const rew = getLesson(serverStep).reward; reward = { xpAwarded: rew.xp, crystalsAwarded: rew.crystals };
  }
  console.log("REWARD computed:", JSON.stringify(reward));
  const reply = await tutor(userText, personaOverride);
  console.log("TUTOR reply:", JSON.stringify(reply));
  const outMod = await moderate(client, SUB_MODEL, reply);
  console.log("OUTPUT moderation:", JSON.stringify(outMod));
}

// Synthetic "before" persona: strip the appended guardrail paragraph (from "ВАЖНО:" onward)
const current = getLesson(1).systemPrompt;
const beforePersona = current.slice(0, current.indexOf("ВАЖНО:")).trimEnd();
console.log("\n[guardrail present in current lesson1 prompt]:", current.includes("Никогда не выдумывай кнопки"));

// 1. BAD input, BEFORE the fix (guardrail stripped) — reproduce hallucination tendency
await run("BAD + NO guardrail (synthetic 'before')", "добрый злой немец", { personaOverride: beforePersona });
// 2. BAD input, AFTER the fix (current prompt with guardrail)
await run("BAD + WITH guardrail (current fixed prompt)", "добрый злой немец");
// 3. HAPPY path, current prompt
await run("HAPPY + WITH guardrail (current fixed prompt)", "храбрый, быстрый, весёлый");
