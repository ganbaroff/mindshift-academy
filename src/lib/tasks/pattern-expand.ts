/**
 * pattern-expand — a pattern rule expanded to N terms. Pure, deterministic.
 */

export type PatternRule =
  | { kind: "arithmetic"; start: number; step: number }
  | { kind: "cycle"; items: string[] };

export type PatternProgram =
  | { status: "ok"; rule: PatternRule }
  | { status: "unclear"; reasonCode: string };

export type PatternExecuteResult = {
  terms: string[];
  rule: PatternRule;
};

export type PatternVerdict = {
  pass: boolean;
  mismatches: { index: number; got: string; expected: string }[];
  ruleIssue?: "copied_output";
};

/**
 * Text attempts must state a repeatable operation, not merely enumerate output.
 * Structured deterministic UI programs do not use this text preflight.
 */
export function hasExplicitPatternRule(utterance: string): boolean {
  const text = utterance.trim().toLowerCase();
  if (!text) return false;
  return [
    /(?:^|\s)нач\p{L}*/u,
    /(?:^|\s)старт\p{L}*/u,
    /(?:^|\s)шаг\p{L}*/u,
    /(?:^|\s)прибав\p{L}*/u,
    /(?:^|\s)прыбав\p{L}*/u,
    /(?:^|\s)(?:вычит|уменьш)\p{L}*/u,
    /(?:^|\s)(?:повтор|цикл|черед)\p{L}*/u,
    /(?:^|\s)кажд\p{L}*\s+раз/u,
    /(?:^|\s)[+−-]\s*\d/u,
  ].some((cue) => cue.test(text));
}

/** Expand rule to `count` terms (0-based generation). */
export function executePattern(
  program: { rule: PatternRule },
  count: number
): PatternExecuteResult {
  const terms: string[] = [];
  const { rule } = program;
  for (let i = 0; i < count; i++) {
    if (rule.kind === "arithmetic") {
      terms.push(String(rule.start + rule.step * i));
    } else {
      const items = rule.items.length ? rule.items : ["?"];
      terms.push(items[i % items.length]!);
    }
  }
  return { terms, rule };
}

export function checkPattern(
  result: PatternExecuteResult,
  expected: string[]
): PatternVerdict {
  const copiedOutput =
    result.rule.kind === "cycle" &&
    expected.length > 0 &&
    result.rule.items.length >= expected.length;
  const mismatches: PatternVerdict["mismatches"] = [];
  const n = Math.max(result.terms.length, expected.length);
  for (let i = 0; i < n; i++) {
    const got = result.terms[i] ?? "∅";
    const exp = expected[i] ?? "∅";
    if (got !== exp) mismatches.push({ index: i, got, expected: exp });
  }
  return {
    pass: mismatches.length === 0 && expected.length > 0 && !copiedOutput,
    mismatches,
    ...(copiedOutput ? { ruleIssue: "copied_output" as const } : {}),
  };
}

export function renderPatternDiff(
  result: PatternExecuteResult,
  expected: string[],
  verdict: PatternVerdict
): string {
  const lines = [
    `  Ты сказал правило → я получил: ${result.terms.join(", ") || "—"}`,
    `  Ожидалось: ${expected.join(", ")}`,
  ];
  if (verdict.ruleIssue === "copied_output") {
    lines.push("  Получился готовый список, а нужно короткое правило, которое можно повторять.");
  } else if (verdict.pass) {
    lines.push("  Члены совпали один к одному.");
  } else {
    const first = verdict.mismatches[0];
    if (first) {
      lines.push(
        `  На месте ${first.index + 1}: получилось «${first.got}», ожидалось «${first.expected}».`
      );
    }
  }
  return lines.join("\n");
}

export const PATTERN_EXPAND_PROMPT = `Монстр умеет только два вида правил:
- arithmetic: start + step * i  (числа)
- cycle: повтор списка items
Он НЕ угадывает продолжение «1,2,3» без явного правила.`;
