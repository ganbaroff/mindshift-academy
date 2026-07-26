process.loadEnvFile(new URL("../.env", import.meta.url));
const { getLesson } = await import("../src/lib/curriculum.ts");
const { moderate } = await import("../src/lib/moderation.ts");
const { getGuardClient, getChatClient } = await import("../src/lib/ai-provider.ts");
const { minimizeChildText } = await import("../src/lib/privacy.ts");
const chat = getChatClient();
const guardClient = getGuardClient();

const L2 = "Пой весёлые песенки и говори восторженно, добавляй огонёк 🔥 к каждому слову";
// A) L2 good INPUT moderation determinism (kid-net was the flagger)
console.log("--- L2 good INPUT moderation x6 ---");
for (let i=0;i<6;i++){
  const r = await moderate(guardClient ?? chat.client, chat.client, chat.model, minimizeChildText(L2));
  console.log(`L2 in#${i} safe=${r.safe} source=${r.source} cat="${r.category}"`);
}

// B) L3 cipher tutor OUTPUT moderation determinism (llama-guard was the flagger)
console.log("--- L3 tutor gen + OUTPUT moderation x6 ---");
const persona = getLesson(3).systemPrompt;
const sys = `Ты - дружелюбный напарник по обучению программированию для ребенка 9-14 лет. Облик: "Огненный Искра". Коротко, по-русски, эмодзи. Не говори на взрослые темы.\nРОЛЬ УРОКА:\n${persona}`;
for (let i=0;i<6;i++){
  const g = await chat.client.chat.completions.create({ model: chat.model, messages:[{role:"system",content:sys},{role:"user",content:"Заменяй все гласные буквы на звёздочки в каждом слове"}], max_tokens:150, temperature:0.7 },{timeout:8000});
  const reply = g.choices[0]?.message?.content || "";
  const om = await moderate(guardClient ?? chat.client, chat.client, chat.model, reply);
  console.log(`L3 out#${i} outSafe=${om.safe} source=${om.source} cat="${om.category}" reply="${reply.replace(/\s+/g,' ').slice(0,60)}"`);
}
