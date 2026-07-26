// The interpreter is the one place a language model touches the learning loop, and the one
// place the design can fail outright. Its job is the opposite of a model's instinct: translate
// the child's words into actions *without helping*.
//
// The distinction the prompt has to teach is subtle and worth stating plainly, because every
// prompt revision must preserve it:
//   RESOLVING a reference is allowed  — "верхний ряд" means row 1, that is determinate.
//   INVENTING content is forbidden    — "нарисуй домик" names no cells, so it is underspecified.
// A model that cannot hold that line makes the course impossible, since a repaired instruction
// means the child never sees the consequence of imprecision.

import OpenAI from "openai";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_MODEL = "gemini-2.5-flash";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.1-8b-instruct";

const SYSTEM_RULES = `Ты — БУКВАЛЬНЫЙ переводчик детских слов в действия. Ты НЕ помощник, НЕ учитель и НЕ подсказчик.
Задача: перевести сказанное ребёнком в список действий — ровно то, что сказано, ни больше и ни меньше.

Железные правила:
1. Никогда не добавляй действие, которого ребёнок не назвал, даже если без него результат получится бессмысленным.
2. Никогда не меняй порядок действий, даже если названный порядок невозможно выполнить.
3. Никогда не угадывай, что ребёнок «имел в виду». Если слова допускают два разных прочтения — верни status "underspecified".
4. Ошибки в написании слов — не помеха: понимай их и переводи. Пробелы в логике — помеха: не заполняй их.
5. Если ребёнок предлагает решить за него («как хочешь», «сам придумай», «сделай красиво») — это status "underspecified": конкретные действия не названы.
6. Отвечай ТОЛЬКО JSON, без пояснений и без markdown.

Что разрешено и что запрещено:
- РАЗРЕШЕНО понимать указания на место, если они однозначны: «верхний ряд» — это строка 1.
- ЗАПРЕЩЕНО придумывать содержание, которое не было названо.`;

const FEWSHOT = {
  "grid-draw": [
    { in: "закрась две клетки", out: { status: "underspecified", reason: "не сказано, какие именно две клетки" } },
    { in: "закрась весь верхний ряд", out: { status: "ok", cells: [[1, 1], [1, 2], [1, 3], [1, 4]] } },
    { in: "нарисуй домик", out: { status: "underspecified", reason: "не названо, какие клетки закрасить" } },
  ],
  "sequence-world": [
    { in: "сделай сэндвич", out: { status: "underspecified", reason: "не названы шаги, которые нужно выполнить" } },
    { in: "намажь масло потом положи хлеб", out: { status: "ok", steps: ["намазать_масло", "положить_хлеб"] } },
  ],
};

export function makeClient(provider = process.env.SPIKE_PROVIDER ?? "gemini") {
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    return {
      provider,
      model: GEMINI_MODEL,
      client: new OpenAI({ apiKey, baseURL: GEMINI_BASE_URL, timeout: 30000, maxRetries: 0 }),
      // gemini-2.5-flash spends max_tokens on hidden reasoning; at small budgets that yields an
      // empty body. The product code disables it for the same reason (src/lib/ai-provider.ts:58).
      extra: { reasoning_effort: "none" },
    };
  }
  if (provider === "nvidia") {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error("NVIDIA_API_KEY not set");
    return {
      provider,
      model: NVIDIA_MODEL,
      client: new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL, timeout: 30000, maxRetries: 0 }),
      extra: {},
    };
  }
  throw new Error(`unknown provider: ${provider}`);
}

function extractJson(text) {
  const stripped = String(text ?? "").replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`no JSON in response: ${stripped.slice(0, 120)}`);
  return JSON.parse(stripped.slice(start, end + 1));
}

/**
 * Measured contract hole (spike run 2): asked to interpret "я голодный, накорми меня", the model
 * answered `ok` with zero steps rather than `underspecified`. Both are honest readings of "you
 * named no actions", but they reach the child differently — one explains, the other leaves the
 * monster silently doing nothing. So an empty program is not a valid `ok`. Collapsing the two
 * shapes here means the UX has one case to handle instead of two.
 */
function emptyIsUnderspecified(raw) {
  if (raw?.status !== "ok") return raw;
  const actionCount = (raw.cells ?? raw.steps ?? []).length;
  if (actionCount > 0) return raw;
  return { status: "underspecified", reason: "не названо ни одного действия" };
}

/**
 * Interprets one child utterance. `family` supplies the world description and output schema.
 * The target is deliberately not a parameter — see README, "the load-bearing invariant".
 */
export async function interpret({ client, model, extra }, family, utterance) {
  const messages = [
    { role: "system", content: `${SYSTEM_RULES}\n\nМир:\n${family.WORLD_PROMPT}\n\nФормат ответа:\n${family.OUTPUT_SCHEMA}` },
  ];
  // Ablation switch. With the examples removed, a high score can no longer come from pattern
  // matching against a demonstrated answer, so the two runs together separate "the rules work"
  // from "the examples were too close to the fixtures".
  if (process.env.SPIKE_FEWSHOT !== "off") {
    for (const shot of FEWSHOT[family.id] ?? []) {
      messages.push({ role: "user", content: shot.in });
      messages.push({ role: "assistant", content: JSON.stringify(shot.out) });
    }
  }
  messages.push({ role: "user", content: utterance });

  const startedAt = Date.now();
  const response = await client.chat.completions.create({
    ...extra,
    model,
    messages,
    temperature: 0,
    max_tokens: 400,
    response_format: { type: "json_object" },
  });
  const latencyMs = Date.now() - startedAt;

  const raw = extractJson(response.choices?.[0]?.message?.content);
  return {
    raw,
    program: family.normalizeProgram(emptyIsUnderspecified(raw)),
    latencyMs,
    promptTokens: response.usage?.prompt_tokens ?? null,
    completionTokens: response.usage?.completion_tokens ?? null,
  };
}
