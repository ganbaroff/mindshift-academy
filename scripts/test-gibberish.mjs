// What does moderation do with harmless gibberish? If it returns safe -> the judge fails it and
// the tutor gently asks to retry (good). If it returns unsafe -> the child gets the safety refusal
// ("давай по-доброму / расскажи взрослому") for pure junk (bad UX). Real Gemini kidNet + NVIDIA guard.
import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
process.env.NVIDIA_API_KEY = env.NVIDIA_API_KEY;

const { moderate } = await import("@/lib/moderation");
const { getGuardClient, getChatClient } = await import("@/lib/ai-provider");
const guard = getGuardClient();
const chat = getChatClient();

const inputs = [
  "фыва абырвалг хрю",
  "asdf qwe 123",
  "ккккк ллллл ммм",
  "добрый злой немец",
  "9999 8888 7777",
];
for (const t of inputs) {
  try {
    const m = await moderate(guard, chat.client, chat.model, t);
    console.log(JSON.stringify(t), "->", m.safe ? "SAFE (reaches judge->gentle retry)" : `BLOCKED by ${m.source} (${m.category})`);
  } catch (e) {
    console.log(JSON.stringify(t), "-> ERROR", e.message);
  }
}
