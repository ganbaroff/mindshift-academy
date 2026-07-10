// One-off Gemini OpenAI-compat reachability + behavior probe. Reads GEMINI_API_KEY
// from env (via dotenv) — NEVER prints the key. Verifies the exact wiring the chat
// loop will use: the existing 'openai' SDK pointed at Google's v1beta/openai/ baseURL,
// model gemini-2.5-flash. Tests: (1) plain chat 200 + text + latency, (2) json_object
// response_format for kidNet, (3) quirks (system role, thinking latency, max_tokens).
import "dotenv/config";
import OpenAI from "openai";

const key = process.env.GEMINI_API_KEY;
if (!key || key === "YOUR_API_KEY_HERE") {
  console.log(JSON.stringify({ ok: false, reason: "GEMINI_API_KEY absent" }));
  process.exit(2);
}
console.log("GEMINI_API_KEY present:", !!key, "len:", key.length);

const MODEL = "gemini-2.5-flash";
const client = new OpenAI({
  apiKey: key,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  timeout: 20000,
  maxRetries: 0,
});

async function probe(label, params) {
  const t0 = Date.now();
  try {
    const r = await client.chat.completions.create(params);
    const ms = Date.now() - t0;
    const txt = (r.choices?.[0]?.message?.content ?? "").slice(0, 200).replace(/\s+/g, " ");
    const finish = r.choices?.[0]?.finish_reason;
    const usage = r.usage;
    return { label, ok: true, ms, finish, sample: txt, usage };
  } catch (e) {
    const ms = Date.now() - t0;
    return { label, ok: false, ms, status: e?.status ?? e?.name ?? "err", msg: String(e?.message || "").slice(0, 200) };
  }
}

// (1) Plain chat: HTTP 200 + text + latency
const plain = await probe("plain", {
  model: MODEL,
  messages: [{ role: "user", content: "Say the single word: pong" }],
  max_tokens: 20,
  temperature: 0,
});
console.log("1) PLAIN:", JSON.stringify(plain));

// (2) json_object response_format on benign kidNet-style input
const jsonMode = await probe("json_object", {
  model: MODEL,
  messages: [
    { role: "system", content: 'You classify if text is inappropriate for a young child. Reply ONLY JSON: {"unsafe": true|false, "category": "..."}.' },
    { role: "user", content: "я хочу чтобы дракончик пел весёлые песенки" },
  ],
  response_format: { type: "json_object" },
  max_tokens: 100,
  temperature: 0,
});
console.log("2) JSON_OBJECT:", JSON.stringify(jsonMode));
let jsonValid = false;
if (jsonMode.ok) {
  try {
    const parsed = JSON.parse(jsonMode.sample);
    jsonValid = typeof parsed.unsafe === "boolean";
    console.log("   parsed OK, unsafe is boolean:", jsonValid, "->", JSON.stringify(parsed));
  } catch (e) {
    console.log("   JSON.parse FAILED:", String(e?.message).slice(0, 120));
  }
}

// (2b) Fallback if json_object unsupported: response_mime_type via extra_body
let jsonFallback = null;
if (!jsonMode.ok || !jsonValid) {
  jsonFallback = await probe("json_mime_extrabody", {
    model: MODEL,
    messages: [
      { role: "system", content: 'Reply ONLY JSON: {"unsafe": true|false, "category": "..."}.' },
      { role: "user", content: "я хочу чтобы дракончик пел весёлые песенки" },
    ],
    max_tokens: 100,
    temperature: 0,
    // @ts-ignore - Google-specific passthrough
    extra_body: { response_mime_type: "application/json" },
  });
  console.log("2b) JSON via extra_body:", JSON.stringify(jsonFallback));
}

// (3a) Quirk: system role handling — does it honor a system instruction?
const sysTest = await probe("system_role", {
  model: MODEL,
  messages: [
    { role: "system", content: "You always answer with exactly one word: BANANA" },
    { role: "user", content: "What is the capital of France?" },
  ],
  max_tokens: 20,
  temperature: 0,
});
console.log("3a) SYSTEM_ROLE:", JSON.stringify(sysTest));

// (3b) Quirk: thinking latency — 2.5-flash is a thinking model. Measure a slightly
// heavier prompt and inspect usage for reasoning/thinking tokens.
const think = await probe("thinking", {
  model: MODEL,
  messages: [{ role: "user", content: "Reply with just the number: what is 17 times 23?" }],
  max_tokens: 50,
  temperature: 0,
});
console.log("3b) THINKING:", JSON.stringify(think));

console.log("SUMMARY:", JSON.stringify({
  reachable: plain.ok,
  plain_ms: plain.ms,
  json_object_supported: jsonMode.ok && jsonValid,
  json_fallback_needed: !!jsonFallback,
  json_fallback_ok: jsonFallback?.ok ?? null,
  system_role_honored: sysTest.ok && /banana/i.test(sysTest.sample || ""),
  thinking_ms: think.ms,
}));
