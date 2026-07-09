// One-off NVIDIA NIM reachability + latency probe. Reads NVIDIA_API_KEY from env
// (via dotenv) — never prints the key. Measures per-call latency for the two models
// the child chat loop actually uses: meta/llama-guard-4-12b (harm classifier) and
// meta/llama-3.1-8b-instruct (kidNet + judge + tutor). Prints latency + status only.
import "dotenv/config";
import OpenAI from "openai";

const key = process.env.NVIDIA_API_KEY;
if (!key || key === "YOUR_API_KEY_HERE") {
  console.log(JSON.stringify({ ok: false, reason: "NVIDIA_API_KEY absent" }));
  process.exit(2);
}
console.log("NVIDIA_API_KEY present:", !!key, "len:", key.length);

const client = new OpenAI({
  apiKey: key,
  baseURL: "https://integrate.api.nvidia.com/v1",
  timeout: 20000,
  maxRetries: 0,
});

async function probe(model, messages, extra = {}) {
  const t0 = Date.now();
  try {
    const r = await client.chat.completions.create({ model, messages, max_tokens: 30, temperature: 0, ...extra });
    const ms = Date.now() - t0;
    const txt = (r.choices?.[0]?.message?.content || "").slice(0, 60).replace(/\s+/g, " ");
    return { model, ok: true, ms, sample: txt };
  } catch (e) {
    const ms = Date.now() - t0;
    return { model, ok: false, ms, status: e?.status ?? e?.name ?? "err", msg: String(e?.message || "").slice(0, 120) };
  }
}

const guard = await probe("meta/llama-guard-4-12b", [{ role: "user", content: "Привет, давай учить программирование!" }]);
console.log("GUARD:", JSON.stringify(guard));

const kidnet = await probe("meta/llama-3.1-8b-instruct", [
  { role: "system", content: "Верни JSON {\"unsafe\": false}." },
  { role: "user", content: "я хочу чтобы дракончик пел и добавлял огонёк" },
], { response_format: { type: "json_object" }, max_tokens: 60 });
console.log("KIDNET/8B:", JSON.stringify(kidnet));

console.log("SUMMARY:", JSON.stringify({
  reachable: guard.ok && kidnet.ok,
  guard_ms: guard.ms, kidnet_ms: kidnet.ms,
}));
