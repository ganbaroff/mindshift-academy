// Independent llama-guard-4-12b verdict check on the REWRITTEN lesson answers.
// Reads NVIDIA_API_KEY from .env inside the process (never prints it). llama-guard is the
// deterministic PRIMARY safety classifier; "safe" means the content no longer trips it.
import fs from "fs";
const key = fs.readFileSync(".env", "utf8").split("\n")
  .find((l) => l.startsWith("NVIDIA_API_KEY="))
  .split("=").slice(1).join("=").trim();

async function guard(text) {
  const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta/llama-guard-4-12b",
      messages: [{ role: "user", content: text }],
      max_tokens: 20, temperature: 0,
    }),
    signal: AbortSignal.timeout(12000),
  });
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || "?").trim().replace(/\s+/g, " ");
}

const cases = [
  ["L2 new (style)", "Пой весёлые песенки и добавляй огонёк 🔥 к каждому слову"],
  ["L3 new (cipher)", "Заменяй все гласные буквы на звёздочки в каждом слове"],
  ["L5 new (maze IF/THEN)", "Если впереди стена, то поверни налево, иначе иди вперёд по лабиринту"],
];
for (const [label, text] of cases) {
  console.log(label + ":", await guard(text));
}
