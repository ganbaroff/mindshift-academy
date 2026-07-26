// LIVE proof of the lesson-1 anti-hallucination fix. Imports the REAL, UNMODIFIED
// modules (moderate/getLesson/getAIClient/minimizeChildText) and mirrors route.ts's
// judge + tutor + output-moderation + reward stages VERBATIM, exactly like prove-loop.mjs,
// but drives LESSON 1 with the CEO's real bad input and a real happy-path input.
import "dotenv/config";
import { moderate } from "../src/lib/moderation.ts";
import { getAIClient } from "../src/lib/ai-provider.ts";
import { getLesson } from "../src/lib/curriculum.ts";
import { minimizeChildText } from "../src/lib/privacy.ts";

const ai = getAIClient();
if (!ai) { console.log("NO AI CLIENT — no NVIDIA key"); process.exit(2); }
console.log("AI model:", ai.model);

async function judgeComprehension(prompt, stepId) {
  const rubric = getLesson(stepId)?.rubric;
  if (!rubric) return { pass: false, reason: "Неизвестный урок." };
  const judge = await ai.client.chat.completions.create({
    model: ai.model, max_tokens: 120, temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content:
        "Ты — строгий, но добрый проверяющий в детской академии промпт-инжиниринга. " +
        "Тебе дают критерий урока и сообщение ребёнка. Верни СТРОГО JSON вида " +
        '{"pass": true|false, "reason": "одно короткое доброе предложение по-русски"}. ' +
        "Засчитывай (pass:true) ТОЛЬКО если ребёнок реально выполнил суть задания, а не просто вставил подходящее слово. " +
        "Бессмысленное, не по теме или лишь формально содержащее ключевое слово сообщение — pass:false. Сомневаешься — pass:false." },
      { role: "user", content: `Критерий урока: ${rubric}\n\nСообщение ребёнка: "${prompt}"` },
    ],
  }, { timeout: 6000 });
  const data = JSON.parse(judge.choices[0]?.message?.content || "{}");
  return { pass: data.pass === true, reason: typeof data.reason === "string" ? data.reason : "" };
}

async function tutor(messages, stepId, skin, name) {
  const lessonPersona = getLesson(stepId)?.systemPrompt ?? null;
  const baseInstruction = `
      Ты - дружелюбный, воодушевляющий игровой напарник по обучению программированию для ребенка 9-14 лет.
      Сейчас ты отыгрываешь облик: "${skin} ${name}".

      ТВОИ ПРАВИЛА:
      1. Отвечай коротко - максимум 2-3 предложения. Язык общения: русский.
      2. Веди себя в соответствии со своей ролью (${name}). Используй эмодзи.
      3. Никогда не говори на взрослые темы, политику, религию, насилие.
      4. Помогай ребенку с заданиями, но не давай готовое решение сразу.
      5. Если ребенок попросил тебя шифровать слова (Шаг 3), выполняй его инструкции.
    `;
  const systemInstruction = lessonPersona
    ? `${baseInstruction}\n      РОЛЬ ТЕКУЩЕГО УРОКА (отыгрывай её ПОВЕРХ облика "${name}", но НЕ нарушая правил безопасности выше):\n      ${lessonPersona}\n    `
    : baseInstruction;
  const openAiMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant",
      content: m.sender === "user" ? minimizeChildText(m.text) : m.text })),
  ];
  const r = await ai.client.chat.completions.create(
    { model: ai.model, messages: openAiMessages, max_tokens: 150, temperature: 0.7 }, { timeout: 8000 });
  return r.choices[0]?.message?.content || "";
}

async function runPipeline(label, userPrompt, { activeStepId = 1, serverStep = 1 } = {}) {
  console.log(`\n===== ${label} =====`);
  console.log("child message:", JSON.stringify(userPrompt));

  const inMod = await moderate(ai.client, ai.model, userPrompt);
  console.log("INPUT moderation:", JSON.stringify(inMod));
  if (!inMod.safe) {
    console.log(`>>> BLOCKED at input (source=${inMod.source}, category=${inMod.category}).`);
    return { blocked: true, stage: "input", inMod };
  }

  const verdict = await judgeComprehension(minimizeChildText(userPrompt), serverStep);
  console.log("JUDGE verdict:", JSON.stringify(verdict));
  const challengeCompleted = verdict.pass;

  let rewardTotals = null;
  if (challengeCompleted && serverStep === activeStepId) {
    const rew = getLesson(serverStep)?.reward;
    rewardTotals = { xpAwarded: rew.xp, crystalsAwarded: rew.crystals };
  }
  console.log("REWARD computed:", JSON.stringify(rewardTotals));

  const msgs = [{ sender: "user", text: userPrompt }];
  const reply = await tutor(msgs, serverStep, "🥚", "Малыш-Дракончик");
  console.log("TUTOR reply:", JSON.stringify(reply));

  const outMod = await moderate(ai.client, ai.model, reply);
  console.log("OUTPUT moderation:", JSON.stringify(outMod));
  const finalReply = outMod.safe ? reply : "Ой, давай поговорим о чём-нибудь добром и по теме урока! 🐲";

  console.log(`>>> RESULT: input.safe=${inMod.safe}, judge.pass=${challengeCompleted}, reward=${JSON.stringify(rewardTotals)}`);
  return { blocked: false, inMod, verdict, rewardTotals, reply: finalReply };
}

// CEO's exact BAD scenario (lesson 1)
await runPipeline("BAD (lesson 1, nonsense 'добрый злой немец')", "добрый злой немец");

// HAPPY PATH (lesson 1, 3 real adjectives)
await runPipeline("HAPPY (lesson 1, 'храбрый, быстрый, весёлый')", "храбрый, быстрый, весёлый");
