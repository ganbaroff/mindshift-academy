/**
 * Russian copy for interpreter refusal codes. The model never authors child-facing text —
 * it returns a code; we render. That keeps the monster's voice consistent and removes
 * model-generated free text from the child's screen (no output moderation needed on refusals).
 */

import type { UnclearReasonCode } from "./types";

const COPY: Record<UnclearReasonCode, string> = {
  no_actions: "Я не услышал ни одного действия. Скажи, что именно сделать.",
  ambiguous_cells: "Не понял, какие именно клетки закрасить. Скажи точнее.",
  ambiguous_steps: "Не понял, какие шаги выполнить. Назови их по порядку.",
  out_of_vocabulary: "Такого действия я не умею. Скажи словами из тех, что я знаю.",
  not_an_instruction: "Это не похоже на задание для меня. Скажи, что закрасить или какие шаги сделать.",
  do_nothing: "Ты сказал ничего не делать — тогда мне нечего выполнить. Назови клетки или шаги.",
};

export function unclearMessage(code: UnclearReasonCode): string {
  return COPY[code] ?? COPY.not_an_instruction;
}

export const UNCLEAR_REASON_CODES = Object.keys(COPY) as UnclearReasonCode[];
