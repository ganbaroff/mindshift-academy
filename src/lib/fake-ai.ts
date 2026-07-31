/**
 * Deterministic fake AI modes for CI (Section 3A.4).
 * Live-provider smoke is separate and never part of ordinary CI.
 */

export type FakeAiMode =
  | "off"
  | "ok"
  | "interpreter_down"
  | "judge_down"
  | "tutor_down"
  | "moderation_error";

/** Active fake mode — never enables itself in production unless explicitly forced for drills. */
export function getFakeAiMode(
  env: NodeJS.ProcessEnv = process.env
): FakeAiMode {
  const raw = (env.FAKE_AI_MODE ?? "").trim().toLowerCase();
  if (
    raw === "ok" ||
    raw === "interpreter_down" ||
    raw === "judge_down" ||
    raw === "tutor_down" ||
    raw === "moderation_error"
  ) {
    return raw;
  }
  // Default CI/dev seam: FAKE_AI=1 → ok (fixture interpreter).
  if (env.FAKE_AI === "1" || env.FAKE_AI === "true") return "ok";
  return "off";
}

export function shouldUseFakeInterpreter(mode = getFakeAiMode()): boolean {
  return mode === "ok" || mode === "interpreter_down";
}

export const CANNED_TUTOR_ENCOURAGEMENT =
  "Монстрик сейчас думает медленнее обычного. Давай попробуем ещё раз через минутку.";

export const ITOG_DEFERRED_MESSAGE =
  "Итог отложен: оценка качества временно недоступна. Формулировка уже принята — путь можно продолжать.";
