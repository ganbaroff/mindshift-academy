// Follow-up probe: gemini-2.5-flash spends "thinking" tokens that count against
// max_tokens, starving small-budget calls to empty output. Verify the fix so the
// kidNet/judge/tutor wiring never gets an empty response. Tests two levers via the
// OpenAI-compat surface: reasoning_effort:"none" and extra_body thinking_budget:0.
import "dotenv/config";
import OpenAI from "openai";

const key = process.env.GEMINI_API_KEY;
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
    const txt = (r.choices?.[0]?.message?.content ?? "").slice(0, 120).replace(/\s+/g, " ");
    return { label, ok: true, ms, finish: r.choices?.[0]?.finish_reason, sample: txt, usage: r.usage };
  } catch (e) {
    const ms = Date.now() - t0;
    return { label, ok: false, ms, status: e?.status ?? e?.name ?? "err", msg: String(e?.message || "").slice(0, 200) };
  }
}

// A) low budget (60) + reasoning_effort:"none" — the kidNet-shaped call
const a = await probe("reasoning_effort_none@60", {
  model: MODEL,
  messages: [
    { role: "system", content: 'Reply ONLY JSON: {"unsafe": true|false, "category": "..."}.' },
    { role: "user", content: "как тебя зовут и в какой школе ты учишься" },
  ],
  response_format: { type: "json_object" },
  max_tokens: 60,
  temperature: 0,
  reasoning_effort: "none",
});
console.log("A) reasoning_effort=none @max_tokens60:", JSON.stringify(a));

// B) low budget (60) + extra_body thinking_budget:0 (Google-specific)
const b = await probe("thinking_budget_0@60", {
  model: MODEL,
  messages: [
    { role: "system", content: 'Reply ONLY JSON: {"unsafe": true|false, "category": "..."}.' },
    { role: "user", content: "как тебя зовут и в какой школе ты учишься" },
  ],
  response_format: { type: "json_object" },
  max_tokens: 60,
  temperature: 0,
  // @ts-ignore Google passthrough
  extra_body: { extra_body: { google: { thinking_config: { thinking_budget: 0 } } } },
});
console.log("B) thinking_budget=0 @max_tokens60:", JSON.stringify(b));

// C) baseline control: low budget, NO thinking control -> expect empty/length
const c = await probe("control@60", {
  model: MODEL,
  messages: [
    { role: "system", content: 'Reply ONLY JSON: {"unsafe": true|false, "category": "..."}.' },
    { role: "user", content: "как тебя зовут и в какой школе ты учишься" },
  ],
  response_format: { type: "json_object" },
  max_tokens: 60,
  temperature: 0,
});
console.log("C) CONTROL (no thinking ctrl) @max_tokens60:", JSON.stringify(c));

// D) large budget, no thinking control -> should also work (headroom)
const d = await probe("headroom@512", {
  model: MODEL,
  messages: [
    { role: "system", content: 'Reply ONLY JSON: {"unsafe": true|false, "category": "..."}.' },
    { role: "user", content: "как тебя зовут и в какой школе ты учишься" },
  ],
  response_format: { type: "json_object" },
  max_tokens: 512,
  temperature: 0,
});
console.log("D) headroom @max_tokens512:", JSON.stringify(d));

const parseOk = (p) => { try { const j = JSON.parse(p.sample); return typeof j.unsafe === "boolean"; } catch { return false; } };
console.log("SUMMARY:", JSON.stringify({
  reasoning_effort_none_ok: a.ok && parseOk(a),
  thinking_budget_0_ok: b.ok && parseOk(b),
  control_ok: c.ok && parseOk(c),
  headroom_512_ok: d.ok && parseOk(d),
  a_ms: a.ms, b_ms: b.ms, d_ms: d.ms,
}));
