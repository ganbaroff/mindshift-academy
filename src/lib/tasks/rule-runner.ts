/**
 * rule-runner — agent driven by the child's IF/THEN(/ELSE) rules across N maps.
 * Pure deterministic executor + checker. No LLM.
 *
 * Opened up 2026-08-11, the same way `sequence-world.ts` was, and for a worse reason.
 *
 * The old engine hardcoded two things. The first was the corridor: one signal («что впереди»)
 * with four values, five actions, nothing else expressible — so weeks 3 and 5 were 23 tasks
 * in one situation. The second was worse: **the engine also decided what the right answer
 * was.** `evaluateMap` carried three hand-written success regimes (`goal`, `stop_on_trap`,
 * `wait_on_wall`), each with its own idea of correct, so a content author could not state
 * "on this map the monster should wait" — they could only pick one of three prebaked moods
 * and hope it meant that.
 *
 * Now: a WORLD declares what can be sensed and what can be done; a MAP is one situation plus
 * the set of actions that count as right in it; the ENGINE only applies the child's rules and
 * compares. The answer lives with the content, where it can be read and argued with.
 *
 * What deliberately did not change:
 *
 *  - **Pure and deterministic.** No LLM, no randomness, same rules → same verdict.
 *  - **The monster reports, it does not judge.** Notes say what it did and what happened,
 *    never what the child got wrong.
 *  - **Legacy maps still run.** 72 maps across five session files use the old
 *    `{ ahead, successWhen }` shape. `normalizeRuleMap` translates them, once, in one place,
 *    reproducing the old verdicts exactly — asserted map-by-map in `tests/tasks.test.mjs`.
 *    Delete the shim when the last legacy map is rewritten, not before.
 */

export type RuleSignalValue = { id: string; labelRu: string };
export type RuleSignal = { id: string; labelRu: string; values: RuleSignalValue[] };
export type RuleActionDef = { id: string; labelRu: string };

export type RuleWorld = {
  id: string;
  /** What the child is looking at, in the monster's words. */
  sceneRu: string;
  /** Everything the monster can sense. One signal is a corridor; two is a decision. */
  signals: RuleSignal[];
  /** Everything it can do. */
  actions: RuleActionDef[];
  /** Taken when no rule matched and no «иначе» was given. */
  fallbackAction: string;
};

/** The world every legacy map runs in: one signal, five verbs. */
export const CORRIDOR_WORLD: RuleWorld = {
  id: "corridor",
  sceneRu: "Монстр смотрит вперёд на одну клетку.",
  signals: [
    {
      id: "ahead",
      labelRu: "впереди",
      values: [
        { id: "open", labelRu: "свободно" },
        { id: "wall", labelRu: "стена" },
        { id: "trap", labelRu: "ловушка" },
        { id: "goal", labelRu: "цель" },
      ],
    },
  ],
  actions: [
    { id: "step", labelRu: "шаг" },
    { id: "turn_left", labelRu: "повернуть налево" },
    { id: "turn_right", labelRu: "повернуть направо" },
    { id: "wait", labelRu: "ждать" },
    { id: "stop", labelRu: "стоп" },
  ],
  fallbackAction: "stop",
};

export const RULE_WORLDS: Record<string, RuleWorld> = {
  [CORRIDOR_WORLD.id]: CORRIDOR_WORLD,
};

/** Unknown ids fall back to the corridor rather than throwing at a child mid-task. */
export function ruleWorld(id?: string | null): RuleWorld {
  return (id && RULE_WORLDS[id]) || CORRIDOR_WORLD;
}

export type RuleCondition =
  | { kind: "signal"; signal: string; value: string }
  /** Legacy spelling of `{ kind: "signal", signal: "ahead" }`. */
  | { kind: "tile"; value: "wall" | "open" | "trap" | "goal" }
  | { kind: "always" };

/** Kept as a name for legacy content and the corridor's four values. */
export type RuleMapCell = "open" | "wall" | "trap" | "goal";
/** Kept as a name; an action is now any id the world declares. */
export type RuleAction = string;

export type ChildRule = {
  if: RuleCondition;
  then: RuleAction;
  else?: RuleAction;
};

export type RuleProgram =
  | { status: "ok"; rules: ChildRule[] }
  | { status: "unclear"; reasonCode: string };

/** The old shape: one tile ahead plus one of three prebaked success regimes. */
export type LegacyRuleMap = {
  id: string;
  ahead: RuleMapCell;
  successWhen: "goal" | "stop_on_trap" | "wait_on_wall";
};

/** The shape content should author from now on. */
export type SituationRuleMap = {
  id: string;
  /** One value per signal the world declares. */
  signals: Record<string, string>;
  /** Every action that counts as right here. More than one when several are equally safe. */
  expect: RuleAction[];
  /** The monster's words when it matched, and when it did not. */
  okRu?: string;
  missRu?: string;
};

export type RuleMap = LegacyRuleMap | SituationRuleMap;

export type RuleMapResult = {
  mapId: string;
  actionTaken: RuleAction;
  pass: boolean;
  note: string;
};

export type RuleExecuteResult = { results: RuleMapResult[] };

export type RuleVerdict = {
  pass: boolean;
  failedMapIds: string[];
  results: RuleMapResult[];
};

/** Anything that is not stepping forward — the four ways to stay put in the corridor. */
const CORRIDOR_AVOID: RuleAction[] = ["stop", "wait", "turn_left", "turn_right"];

function isLegacy(map: RuleMap): map is LegacyRuleMap {
  return typeof (map as LegacyRuleMap).ahead === "string";
}

/**
 * The one place the old success regimes are written down, so their quirks are visible
 * instead of scattered through three branches.
 *
 * Quirk worth knowing before authoring: under `stop_on_trap` a WALL ahead expected a step —
 * the old engine only guarded the trap. Reproduced here on purpose; a child mid-pilot must
 * not have yesterday's passing answer turn into today's miss. New content should say what it
 * means with `expect` instead of inheriting this.
 */
function legacyExpectation(map: LegacyRuleMap): RuleAction[] {
  const guarded =
    map.successWhen === "goal"
      ? (["wall", "trap"] as RuleMapCell[])
      : map.successWhen === "stop_on_trap"
        ? (["trap"] as RuleMapCell[])
        : (["wall"] as RuleMapCell[]);
  if (guarded.includes(map.ahead)) return [...CORRIDOR_AVOID];
  return ["step"];
}

function legacyCopy(map: LegacyRuleMap, expect: RuleAction[]): { okRu: string; missRu: string } {
  if (expect.length > 1) {
    return {
      okRu: `я не врезался в «${map.ahead}»`,
      missRu: `я шагнул в «${map.ahead}»`,
    };
  }
  if (map.ahead === "goal") {
    return { okRu: "я дошёл до цели", missRu: "цель рядом, но шага не было" };
  }
  return {
    okRu: "я шагнул на свободную клетку",
    missRu: "свободная клетка была, но я не шагнул",
  };
}

/** Legacy or new, every map becomes one situation with one set of right answers. */
export function normalizeRuleMap(map: RuleMap): Required<SituationRuleMap> {
  if (!isLegacy(map)) {
    return {
      id: map.id,
      signals: map.signals,
      expect: map.expect,
      okRu: map.okRu ?? "правило сработало",
      missRu: map.missRu ?? "правило сюда не подошло",
    };
  }
  const expect = legacyExpectation(map);
  const copy = legacyCopy(map, expect);
  return { id: map.id, signals: { ahead: map.ahead }, expect, ...copy };
}

function matches(condition: RuleCondition, signals: Record<string, string>): boolean {
  if (condition.kind === "always") return true;
  if (condition.kind === "tile") return signals.ahead === condition.value;
  return signals[condition.signal] === condition.value;
}

function pickAction(
  rules: ChildRule[],
  signals: Record<string, string>,
  world: RuleWorld
): RuleAction {
  for (const rule of rules) {
    if (matches(rule.if, signals)) return rule.then;
  }
  for (const rule of rules) {
    if (rule.else) return rule.else;
  }
  return world.fallbackAction;
}

function describe(signals: Record<string, string>, world: RuleWorld): string {
  return world.signals
    .filter((signal) => signals[signal.id] !== undefined)
    .map((signal) => {
      const value = signal.values.find((v) => v.id === signals[signal.id]);
      return `${signal.labelRu} «${value?.labelRu ?? signals[signal.id]}»`;
    })
    .join(", ");
}

function evaluateMap(map: RuleMap, rules: ChildRule[], world: RuleWorld): RuleMapResult {
  const situation = normalizeRuleMap(map);
  if (!rules.length) {
    return {
      mapId: situation.id,
      actionTaken: world.fallbackAction,
      pass: false,
      note: "правил нет — я не знаю, что делать",
    };
  }
  const action = pickAction(rules, situation.signals, world);
  const pass = situation.expect.includes(action);
  // The action id came from the child's rule, which came through the interpreter — so it
  // is model-influenced. Print the WORLD's label for it, never the string itself. The old
  // engine could interpolate safely because the type was a five-value enum; widening ids
  // to per-world strings would have put model output in front of a child.
  const known = world.actions.find((a) => a.id === action);
  return {
    mapId: situation.id,
    actionTaken: action,
    pass,
    note: known
      ? `${describe(situation.signals, world)}, я сделал «${known.labelRu}» — ${
          pass ? situation.okRu : situation.missRu
        }`
      : `${describe(situation.signals, world)}, а такого действия я не умею`,
  };
}

/** Pure. Applies the first matching rule to each map. */
export function executeRuleRunner(
  program: { rules: ChildRule[] },
  maps: RuleMap[],
  world: RuleWorld = CORRIDOR_WORLD
): RuleExecuteResult {
  return { results: maps.map((m) => evaluateMap(m, program.rules, world)) };
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

export function ruleWorldPrompt(world: RuleWorld = CORRIDOR_WORLD): string {
  const signals = world.signals
    .map((s) => `- ${s.id} (${s.labelRu}): ${s.values.map((v) => v.id).join(", ")}`)
    .join("\n");
  return `${world.sceneRu}
Монстр может видеть:
${signals}
Ребёнок задаёт правило ЕСЛИ-ТО (и по желанию ИНАЧЕ). Действия: ${world.actions
    .map((a) => a.id)
    .join(", ")}.
Монстр применяет правило буквально на каждой карте.`;
}

/** Back-compat for callers that predate multiple worlds. */
export const RULE_RUNNER_PROMPT = ruleWorldPrompt(CORRIDOR_WORLD);
