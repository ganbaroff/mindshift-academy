/**
 * rule-runner — agent driven by the child's IF/THEN(/ELSE) rules across N maps.
 * Pure deterministic executor + checker. No LLM.
 */

export type RuleCondition =
  | { kind: "tile"; value: "wall" | "open" | "trap" | "goal" }
  | { kind: "always" };

export type RuleAction = "step" | "turn_left" | "turn_right" | "wait" | "stop";

export type ChildRule = {
  if: RuleCondition;
  then: RuleAction;
  else?: RuleAction;
};

export type RuleProgram =
  | { status: "ok"; rules: ChildRule[] }
  | { status: "unclear"; reasonCode: string };

export type RuleMapCell = "open" | "wall" | "trap" | "goal";

export type RuleMap = {
  id: string;
  /** Ahead-of-agent tile for this simplified 1-step world. */
  ahead: RuleMapCell;
  /** Whether reaching "goal" (or surviving trap via else) counts as success. */
  successWhen: "goal" | "stop_on_trap" | "wait_on_wall";
};

export type RuleMapResult = {
  mapId: string;
  actionTaken: RuleAction;
  pass: boolean;
  note: string;
};

export type RuleExecuteResult = {
  results: RuleMapResult[];
};

export type RuleVerdict = {
  pass: boolean;
  failedMapIds: string[];
  results: RuleMapResult[];
};

function pickAction(rules: ChildRule[], ahead: RuleMapCell): RuleAction {
  for (const rule of rules) {
    const matches =
      rule.if.kind === "always" ||
      (rule.if.kind === "tile" && rule.if.value === ahead);
    if (matches) return rule.then;
  }
  for (const rule of rules) {
    if (rule.else) return rule.else;
  }
  return "stop";
}

function evaluateMap(map: RuleMap, rules: ChildRule[]): RuleMapResult {
  if (!rules.length) {
    return {
      mapId: map.id,
      actionTaken: "stop",
      pass: false,
      note: "правил нет — я не знаю, что делать",
    };
  }
  const action = pickAction(rules, map.ahead);
  const avoidStep = action === "stop" || action === "wait" || action === "turn_left" || action === "turn_right";
  let pass = false;
  let note = `впереди «${map.ahead}», я сделал «${action}»`;

  if (map.successWhen === "goal") {
    if (map.ahead === "goal") {
      pass = action === "step";
      note = pass ? "я дошёл до цели" : "цель рядом, но шага не было";
    } else if (map.ahead === "wall" || map.ahead === "trap") {
      pass = avoidStep;
      note = pass ? `я не врезался в «${map.ahead}»` : `я шагнул в «${map.ahead}»`;
    } else {
      pass = action === "step";
      note = pass ? "я шагнул на свободную клетку" : "свободная клетка была, но я не шагнул";
    }
  } else if (map.successWhen === "stop_on_trap") {
    if (map.ahead === "trap") {
      pass = avoidStep;
      note = pass ? "на ловушке я остановился" : "на ловушке я шагнул и застрял";
    } else if (map.ahead === "goal") {
      pass = action === "step";
      note = pass ? "я дошёл до цели" : "цель была рядом, но я не шагнул";
    } else {
      pass = action === "step";
      note = pass ? "я шагнул дальше" : "я не шагнул, хотя путь был свободен";
    }
  } else {
    // wait_on_wall
    if (map.ahead === "wall") {
      pass = avoidStep;
      note = pass ? "у стены я не врезался" : "я шагнул в стену";
    } else if (map.ahead === "goal") {
      pass = action === "step";
      note = pass ? "я дошёл до цели" : "цель рядом, но шага не было";
    } else {
      pass = action === "step";
      note = pass ? "я шагнул дальше" : "я не шагнул, хотя путь был свободен";
    }
  }
  return { mapId: map.id, actionTaken: action, pass, note };
}

/** Pure. Applies the first rule to each map. */
export function executeRuleRunner(
  program: { rules: ChildRule[] },
  maps: RuleMap[]
): RuleExecuteResult {
  return { results: maps.map((m) => evaluateMap(m, program.rules)) };
}

export function checkRuleRunner(result: RuleExecuteResult): RuleVerdict {
  const failedMapIds = result.results.filter((r) => !r.pass).map((r) => r.mapId);
  return {
    pass: failedMapIds.length === 0 && result.results.length > 0,
    failedMapIds,
    results: result.results,
  };
}

export function renderRuleDiff(result: RuleExecuteResult, verdict: RuleVerdict): string {
  const lines: string[] = ["  Прогон по картам:"];
  for (const r of result.results) {
    lines.push(`  • ${r.mapId}: ${r.note} → ${r.pass ? "ок" : "не совпало"}`);
  }
  if (verdict.pass) {
    lines.push("  На всех картах правило сработало.");
  } else {
    lines.push(
      `  Не совпало на: ${verdict.failedMapIds.join(", ") || "—"}. Скажи правило так, чтобы оно работало и там.`
    );
  }
  return lines.join("\n");
}

export const RULE_RUNNER_PROMPT = `Монстр смотрит ВПЕРЁД на одну клетку. Клетка бывает: open, wall, trap, goal.
Ребёнок задаёт правило ЕСЛИ-ТО (и по желанию ИНАЧЕ). Действия: step, turn_left, turn_right, wait, stop.
Монстр применяет правило буквально на каждой карте.`;
