/**
 * Literal interpreter — the only LLM touchpoint on the executable-task path.
 * Never receives the target. Returns actions or a closed refusal code; never free-text
 * for the child. See docs/superpowers/specs/2026-07-27-thinking-curriculum-design.md.
 */

import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getChatClient } from "@/lib/ai-provider";
import { GRID_SIZE, GRID_WORLD_PROMPT } from "./grid-draw";
import { SEQUENCE_ACTIONS, SEQUENCE_WORLD_PROMPT } from "./sequence-world";
import { gridProgramSchema, sequenceProgramSchema } from "./schemas";
import type { GridProgram, SequenceProgram, TaskFamilyId, UnclearReasonCode } from "./types";
import { UNCLEAR_REASON_CODES } from "./unclear-copy";

export type ChatConn = { client: OpenAI; model: string };

const SYSTEM_RULES = `Ты — БУКВАЛЬНЫЙ переводчик детских слов в действия. Ты НЕ помощник, НЕ учитель и НЕ подсказчик.
Задача: перевести сказанное ребёнком в список действий — ровно то, что сказано, ни больше и ни меньше.

Железные правила:
1. Никогда не добавляй действие, которого ребёнок не назвал, даже если без него результат получится бессмысленным.
2. Никогда не меняй порядок действий, даже если названный порядок невозможно выполнить.
3. Никогда не угадывай, что ребёнок «имел в виду». Если слова допускают два разных прочтения — верни status "unclear".
4. Ошибки в написании слов — не помеха: понимай их и переводи. Пробелы в логике — помеха: не заполняй их.
5. Если ребёнок предлагает решить за него («как хочешь», «сам придумай», «сделай красиво») — это status "unclear".
6. Отвечай ТОЛЬКО JSON, без пояснений и без markdown.
7. При status "unclear" поле reasonCode — ОДИН код из списка. Никакого свободного текста.

Разрешено понимать однозначные указания на место («верхний ряд» = строка 1).
Запрещено придумывать содержание, которое не было названо.`;

const REASON_LIST = UNCLEAR_REASON_CODES.join(" | ");

const GRID_OUTPUT = `{"status":"ok","cells":[[строка,столбец], ...]}
или {"status":"unclear","reasonCode":"${REASON_LIST}"}
Строки и столбцы нумеруй с 1. cells не может быть пустым при status ok.`;

const SEQ_OUTPUT = `{"status":"ok","steps":["действие", ...]}
или {"status":"unclear","reasonCode":"${REASON_LIST}"}
Используй только действия из списка мира, ровно в написанном виде. steps не может быть пустым при status ok.`;

const FEWSHOT: Record<TaskFamilyId, { in: string; out: Record<string, unknown> }[]> = {
  "grid-draw": [
    { in: "закрась две клетки", out: { status: "unclear", reasonCode: "ambiguous_cells" } },
    {
      in: "закрась весь верхний ряд",
      out: { status: "ok", cells: [[1, 1], [1, 2], [1, 3], [1, 4]] },
    },
    { in: "нарисуй домик", out: { status: "unclear", reasonCode: "ambiguous_cells" } },
  ],
  "sequence-world": [
    { in: "сделай сэндвич", out: { status: "unclear", reasonCode: "ambiguous_steps" } },
    {
      in: "намажь масло потом положи хлеб",
      out: { status: "ok", steps: ["намазать_масло", "положить_хлеб"] },
    },
  ],
};

function worldFor(family: TaskFamilyId): { prompt: string; schema: string } {
  if (family === "grid-draw") {
    return { prompt: GRID_WORLD_PROMPT, schema: GRID_OUTPUT };
  }
  return {
    prompt: `${SEQUENCE_WORLD_PROMPT}\nДействия: ${SEQUENCE_ACTIONS.join(", ")}`,
    schema: SEQ_OUTPUT,
  };
}

function extractJson(text: string): unknown {
  const stripped = String(text ?? "")
    .replace(/```(?:json)?/gi, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`no JSON in response: ${stripped.slice(0, 120)}`);
  }
  return JSON.parse(stripped.slice(start, end + 1));
}

function asReasonCode(value: unknown, fallback: UnclearReasonCode): UnclearReasonCode {
  return typeof value === "string" && (UNCLEAR_REASON_CODES as string[]).includes(value)
    ? (value as UnclearReasonCode)
    : fallback;
}

/**
 * Collapse legacy spike statuses and empty ok programs into the product contract.
 * Measured: empty ok leaves the monster silent; empty is always unclear/no_actions.
 */
export function coerceRawProgram(family: TaskFamilyId, raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return { status: "unclear", reasonCode: "not_an_instruction" };
  const obj = raw as Record<string, unknown>;
  let status = obj.status;
  if (status === "underspecified" || status === "irrelevant") status = "unclear";

  if (status === "ok") {
    const actions = family === "grid-draw" ? obj.cells : obj.steps;
    if (!Array.isArray(actions) || actions.length === 0) {
      return { status: "unclear", reasonCode: "no_actions" };
    }
    return { ...obj, status: "ok" };
  }

  if (status === "unclear") {
    const fallback: UnclearReasonCode =
      family === "grid-draw" ? "ambiguous_cells" : "ambiguous_steps";
    // Accept free-text `reason` from older models by mapping to a code — never pass it through.
    let reasonCode = asReasonCode(obj.reasonCode, fallback);
    if (!obj.reasonCode && typeof obj.reason === "string") {
      const r = obj.reason.toLowerCase();
      if (r.includes("не назван") || r.includes("ни одного")) reasonCode = "no_actions";
      else if (r.includes("погод") || r.includes("анекдот") || r.includes("не инструкц")) {
        reasonCode = "not_an_instruction";
      } else if (r.includes("не умею") || r.includes("тостер") || r.includes("цвет")) {
        reasonCode = "out_of_vocabulary";
      }
    }
    return { status: "unclear", reasonCode };
  }

  return { status: "unclear", reasonCode: "not_an_instruction" };
}

/** Normalize 1-based grid cells → 0-based and validate. */
export function parseGridProgram(raw: unknown): GridProgram {
  const coerced = coerceRawProgram("grid-draw", raw) as Record<string, unknown>;
  if (coerced.status === "ok" && Array.isArray(coerced.cells)) {
    coerced.cells = coerced.cells.map((pair) => {
      const [row, col] = pair as [number, number];
      return [Number(row) - 1, Number(col) - 1];
    });
  }
  const parsed = gridProgramSchema.safeParse(coerced);
  if (!parsed.success) {
    return { status: "unclear", reasonCode: "ambiguous_cells" };
  }
  // Bounds check: cells outside 0..GRID_SIZE-1 stay in the program so the executor can report them.
  return parsed.data as GridProgram;
}

export function parseSequenceProgram(raw: unknown): SequenceProgram {
  const coerced = coerceRawProgram("sequence-world", raw);
  const parsed = sequenceProgramSchema.safeParse(coerced);
  if (!parsed.success) {
    return { status: "unclear", reasonCode: "ambiguous_steps" };
  }
  if (parsed.data.status === "ok") {
    const unknown = parsed.data.steps.find((s) => !(SEQUENCE_ACTIONS as readonly string[]).includes(s));
    if (unknown) return { status: "unclear", reasonCode: "out_of_vocabulary" };
  }
  return parsed.data as SequenceProgram;
}

export type InterpretResult =
  | { family: "grid-draw"; program: GridProgram; latencyMs: number; model: string }
  | { family: "sequence-world"; program: SequenceProgram; latencyMs: number; model: string };

/**
 * Interprets one utterance. `target` is deliberately not a parameter.
 * `conn` is injectable for tests; defaults to getChatClient().
 */
export async function interpretUtterance(
  family: TaskFamilyId,
  utterance: string,
  conn: ChatConn | null = getChatClient()
): Promise<InterpretResult> {
  if (!conn) {
    throw new Error("NO_CHAT_PROVIDER");
  }

  const { prompt, schema } = worldFor(family);
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${SYSTEM_RULES}\n\nМир:\n${prompt}\n\nФормат ответа:\n${schema}`,
    },
  ];
  for (const shot of FEWSHOT[family]) {
    messages.push({ role: "user", content: shot.in });
    messages.push({ role: "assistant", content: JSON.stringify(shot.out) });
  }
  messages.push({ role: "user", content: utterance });

  const startedAt = Date.now();
  const response = await conn.client.chat.completions.create(
    {
      model: conn.model,
      messages,
      temperature: 0,
      max_tokens: 400,
      response_format: { type: "json_object" },
    },
    { timeout: 12000 }
  );
  const latencyMs = Date.now() - startedAt;
  const raw = extractJson(response.choices?.[0]?.message?.content ?? "");

  if (family === "grid-draw") {
    return {
      family,
      program: parseGridProgram(raw),
      latencyMs,
      model: conn.model,
    };
  }
  return {
    family,
    program: parseSequenceProgram(raw),
    latencyMs,
    model: conn.model,
  };
}

/** Exposed for content that documents the grid size to the child UI. */
export { GRID_SIZE };
