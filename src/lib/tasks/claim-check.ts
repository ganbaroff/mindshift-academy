/**
 * claim-check — child's labels applied to true/false claims. Pure, deterministic.
 */

export type Claim = {
  id: string;
  text: string;
  /** Ground truth — never shown as "answer key" in child feedback wording. */
  truth: boolean;
};

export type ClaimCheckProgram =
  | { status: "ok"; labels: Record<string, boolean> }
  | { status: "unclear"; reasonCode: string };

export type ClaimCheckResult = {
  perClaim: {
    id: string;
    childLabel: boolean | null;
    truth: boolean;
    correct: boolean;
  }[];
};

export type ClaimCheckVerdict = {
  pass: boolean;
  missedFalseIds: string[];
  falseAlarmIds: string[];
  unlabeledIds: string[];
};

export function executeClaimCheck(
  program: { labels: Record<string, boolean> },
  claims: Claim[]
): ClaimCheckResult {
  return {
    perClaim: claims.map((c) => {
      const childLabel = Object.prototype.hasOwnProperty.call(program.labels, c.id)
        ? Boolean(program.labels[c.id])
        : null;
      const correct = childLabel === c.truth;
      return { id: c.id, childLabel, truth: c.truth, correct };
    }),
  };
}

export function checkClaimCheck(result: ClaimCheckResult): ClaimCheckVerdict {
  const missedFalseIds: string[] = [];
  const falseAlarmIds: string[] = [];
  const unlabeledIds: string[] = [];
  for (const row of result.perClaim) {
    if (row.childLabel === null) {
      unlabeledIds.push(row.id);
      continue;
    }
    if (row.truth === false && row.childLabel === true) missedFalseIds.push(row.id);
    if (row.truth === true && row.childLabel === false) falseAlarmIds.push(row.id);
  }
  return {
    pass:
      unlabeledIds.length === 0 &&
      missedFalseIds.length === 0 &&
      falseAlarmIds.length === 0 &&
      result.perClaim.length > 0,
    missedFalseIds,
    falseAlarmIds,
    unlabeledIds,
  };
}

export function renderClaimDiff(
  result: ClaimCheckResult,
  verdict: ClaimCheckVerdict
): string {
  const lines = ["  Проверка утверждений:"];
  for (const row of result.perClaim) {
    const mark =
      row.childLabel === null ? "нет метки" : row.correct ? "совпало" : "не совпало";
    lines.push(
      `  • ${row.id}: ты пометил ${row.childLabel === null ? "—" : row.childLabel ? "верно" : "ложно"} → ${mark}`
    );
  }
  if (verdict.pass) {
    lines.push("  Все метки совпали с проверкой.");
  } else {
    if (verdict.missedFalseIds.length) {
      lines.push(
        `  Уверенные ложные утверждения не пойманы: ${verdict.missedFalseIds.join(", ")}.`
      );
    }
    if (verdict.falseAlarmIds.length) {
      lines.push(
        `  Верные утверждения помечены как ложные: ${verdict.falseAlarmIds.join(", ")}.`
      );
    }
    if (verdict.unlabeledIds.length) {
      lines.push(`  Нет метки для: ${verdict.unlabeledIds.join(", ")}.`);
    }
  }
  return lines.join("\n");
}

export const CLAIM_CHECK_PROMPT = `Монстр делает утверждения (часть верные, часть ложные, иногда очень уверенно).
Ребёнок помечает каждое утверждение: true или false. Нельзя оставлять без метки.`;
