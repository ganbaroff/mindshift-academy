/**
 * Week 2 task family: ordered procedure. The monster stops at the first impossible step.
 * Action vocabulary is a whitelist — model output never reaches the child as free text.
 */

import type { SequenceProgram, UnclearReasonCode } from "./types";

export const SEQUENCE_ACTIONS = [
  "взять_нож",
  "положить_хлеб",
  "намазать_масло",
  "положить_сыр",
  "накрыть_хлебом",
  "подать",
] as const;

export type SequenceAction = (typeof SEQUENCE_ACTIONS)[number];

type WorldState = {
  knifeInHand: boolean;
  breadSlicesUsed: number;
  butterSpread: boolean;
  cheeseOn: boolean;
  covered: boolean;
  served: boolean;
};

export type SequenceFailure = {
  index: number;
  action: string;
  code: string;
};

export type SequenceExecuteResult = {
  state: WorldState;
  done: SequenceAction[];
  failure: SequenceFailure | null;
};

export type SequenceVerdict = {
  pass: boolean;
  failure: SequenceFailure | null;
  state: WorldState;
};

const initialState = (): WorldState => ({
  knifeInHand: false,
  breadSlicesUsed: 0,
  butterSpread: false,
  cheeseOn: false,
  covered: false,
  served: false,
});

type Rule = {
  can: (s: WorldState) => string | null;
  apply: (s: WorldState) => WorldState;
};

const RULES: Record<SequenceAction, Rule> = {
  взять_нож: {
    can: (s) => (s.knifeInHand ? "нож_уже_в_руке" : null),
    apply: (s) => ({ ...s, knifeInHand: true }),
  },
  положить_хлеб: {
    can: (s) => (s.breadSlicesUsed >= 2 ? "хлеб_закончился" : null),
    apply: (s) => ({ ...s, breadSlicesUsed: s.breadSlicesUsed + 1 }),
  },
  намазать_масло: {
    can: (s) => {
      if (!s.knifeInHand) return "нет_ножа";
      if (s.breadSlicesUsed === 0) return "нет_хлеба";
      if (s.butterSpread) return "уже_намазано";
      return null;
    },
    apply: (s) => ({ ...s, butterSpread: true }),
  },
  положить_сыр: {
    can: (s) => {
      if (s.breadSlicesUsed === 0) return "нет_хлеба";
      if (s.covered) return "сэндвич_уже_закрыт";
      return null;
    },
    apply: (s) => ({ ...s, cheeseOn: true }),
  },
  накрыть_хлебом: {
    can: (s) => {
      if (s.breadSlicesUsed === 0) return "нет_хлеба";
      if (s.breadSlicesUsed >= 2) return "хлеб_закончился";
      if (s.covered) return "сэндвич_уже_закрыт";
      return null;
    },
    apply: (s) => ({ ...s, breadSlicesUsed: s.breadSlicesUsed + 1, covered: true }),
  },
  подать: {
    can: (s) => (s.covered && s.butterSpread && s.cheeseOn ? null : "не_готово"),
    apply: (s) => ({ ...s, served: true }),
  },
};

const FAILURE_COPY: Record<string, string> = {
  нож_уже_в_руке: "нож уже был у меня в руке",
  хлеб_закончился: "ломтиков хлеба больше нет, их всего два",
  нет_ножа: "у меня в руке нет ножа, а рукой я масло не мажу",
  нет_хлеба: "на тарелке нет хлеба, мазать не на что",
  уже_намазано: "масло я уже намазал",
  сэндвич_уже_закрыт: "сэндвич уже накрыт сверху, внутрь не добраться",
  не_готово: "подавать нечего, сэндвич ещё не собран",
  неизвестное_действие: "такого действия я не умею",
};

function isSequenceAction(action: string): action is SequenceAction {
  return (SEQUENCE_ACTIONS as readonly string[]).includes(action);
}

/** Pure. Runs until the first impossible step, then stops. */
export function executeSequence(program: { steps: string[] }): SequenceExecuteResult {
  let state = initialState();
  const done: SequenceAction[] = [];
  for (const [index, action] of program.steps.entries()) {
    if (!isSequenceAction(action)) {
      return { state, done, failure: { index, action, code: "неизвестное_действие" } };
    }
    const rule = RULES[action];
    const code = rule.can(state);
    if (code) return { state, done, failure: { index, action, code } };
    state = rule.apply(state);
    done.push(action);
  }
  return { state, done, failure: null };
}

export function checkSequence(result: SequenceExecuteResult): SequenceVerdict {
  return {
    pass: result.failure === null && result.state.served,
    failure: result.failure,
    state: result.state,
  };
}

/** Monster's voice. Never blames the child. */
export function renderSequenceDiff(result: SequenceExecuteResult, verdict: SequenceVerdict): string {
  const lines: string[] = [];
  if (result.done.length) {
    lines.push(`  Я успел сделать: ${result.done.join(" \u2192 ")}`);
  } else {
    lines.push("  Я не смог начать.");
  }

  if (verdict.pass) {
    lines.push("  Сэндвич собран и подан. Порядок шагов был верный.");
    return lines.join("\n");
  }

  if (result.failure) {
    const { index, action, code } = result.failure;
    lines.push(
      `  На шаге ${index + 1} ты сказал «${action}», и я застрял: ${FAILURE_COPY[code] ?? code}.`
    );
  } else {
    const missing: string[] = [];
    if (!result.state.butterSpread) missing.push("масло не намазано");
    if (!result.state.cheeseOn) missing.push("сыр не положен");
    if (!result.state.covered) missing.push("сверху не накрыто");
    if (!result.state.served) missing.push("я не подал сэндвич");
    lines.push(`  Шаги закончились, а сэндвича нет: ${missing.join(", ")}. Ты не сказал мне про это.`);
  }
  return lines.join("\n");
}

export const SEQUENCE_WORLD_PROMPT = `Монстр стоит у стола. На столе: два ломтика хлеба, масло, сыр, нож, тарелка.
Монстр умеет выполнять только эти действия и никакие другие:
${SEQUENCE_ACTIONS.map((a) => `- ${a}`).join("\n")}
Монстр выполняет действия строго в том порядке, в котором их назвали, и останавливается,
если действие физически невозможно.`;

const REASON_CODES: ReadonlySet<string> = new Set([
  "no_actions",
  "ambiguous_cells",
  "ambiguous_steps",
  "out_of_vocabulary",
  "not_an_instruction",
  "do_nothing",
]);

export function normalizeSequenceProgram(raw: {
  status: string;
  steps?: unknown;
  reasonCode?: string;
}): SequenceProgram {
  if (raw.status !== "ok") {
    const code = REASON_CODES.has(raw.reasonCode ?? "")
      ? (raw.reasonCode as UnclearReasonCode)
      : "ambiguous_steps";
    return { status: "unclear", reasonCode: code };
  }
  const steps = Array.isArray(raw.steps) ? raw.steps.map(String) : [];
  return { status: "ok", steps };
}
