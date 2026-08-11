/**
 * Week 2 task family: ordered procedure. The monster stops at the first impossible step.
 * Action vocabulary is a whitelist — model output never reaches the child as free text.
 *
 * Rewritten 2026-08-11. The world used to BE the sandwich: one hardcoded action list, one
 * hardcoded state machine, one hardcoded failure vocabulary. Every sequence task in the
 * course therefore taught the same six steps, and all fifteen tasks of week 2 asked a child
 * to build the same sandwich three sessions running. That is not a content oversight anyone
 * could author around — the engine made variety impossible.
 *
 * A world is now data: a vocabulary, a counter bag, and per-action requirements and
 * effects. The properties that made the old version safe are kept deliberately:
 *
 *  - **Whitelist, still.** A step outside `world.actions` is refused before execution, so
 *    a model can never put free text in front of a child.
 *  - **Pure and deterministic.** Integers and comparisons only — no expressions, no eval,
 *    no closures in content. The same program always produces the same verdict.
 *  - **The monster stops, it does not judge.** Failure copy names what the monster could
 *    not do, never what the child got wrong.
 *
 * Booleans are counters that go 0 → 1. One numeric state keeps requirements expressible as
 * min/max and keeps the whole world comparable, printable and diffable.
 */

import type { SequenceProgram, UnclearReasonCode } from "./types";
import { PUBLIC_SEQUENCE_WORLDS, type PublicSequenceWorld } from "./sequence-worlds-public";

export type SequenceRequirement = {
  /** State counter this step depends on. */
  key: string;
  /** Refuse the step when `state[key]` is below this. */
  min?: number;
  /** Refuse the step when `state[key]` is above this. */
  max?: number;
  /** Failure code raised when the requirement does not hold. */
  failure: string;
};

export type SequenceRule = {
  /** Checked in order; the first that fails names the stop. */
  requires?: SequenceRequirement[];
  /** Applied as deltas once the step runs. */
  effects: Record<string, number>;
};

export type SequenceWorld = PublicSequenceWorld & {
  /** Every counter starts here. A key absent from this bag is a bug, not a zero. */
  initial: Record<string, number>;
  rules: Record<string, SequenceRule>;
  /** Success is this counter reaching 1 — the world's "and it was actually delivered". */
  goalKey: string;
  /** Monster's voice, per failure code. */
  failureRu: Record<string, string>;
  /** For "the steps ran out and nothing happened": which counters were still short. */
  missingRu: { key: string; min: number; textRu: string }[];
  /** What the monster says when it worked. */
  doneRu: string;
};

/**
 * Week 2 · session 1 — the original world, kept exactly as it behaved.
 * A first procedure should be one the child has watched an adult do a hundred times.
 */
export const SANDWICH_WORLD: SequenceWorld = {
  ...PUBLIC_SEQUENCE_WORLDS.sandwich,
  initial: { нож: 0, хлеб: 0, масло: 0, сыр: 0, накрыто: 0, подано: 0 },
  rules: {
    взять_нож: {
      requires: [{ key: "нож", max: 0, failure: "нож_уже_в_руке" }],
      effects: { нож: 1 },
    },
    положить_хлеб: {
      requires: [{ key: "хлеб", max: 1, failure: "хлеб_закончился" }],
      effects: { хлеб: 1 },
    },
    намазать_масло: {
      requires: [
        { key: "нож", min: 1, failure: "нет_ножа" },
        { key: "хлеб", min: 1, failure: "нет_хлеба" },
        { key: "масло", max: 0, failure: "уже_намазано" },
      ],
      effects: { масло: 1 },
    },
    положить_сыр: {
      requires: [
        { key: "хлеб", min: 1, failure: "нет_хлеба" },
        { key: "накрыто", max: 0, failure: "сэндвич_уже_закрыт" },
      ],
      effects: { сыр: 1 },
    },
    накрыть_хлебом: {
      requires: [
        { key: "хлеб", min: 1, failure: "нет_хлеба" },
        { key: "хлеб", max: 1, failure: "хлеб_закончился" },
        { key: "накрыто", max: 0, failure: "сэндвич_уже_закрыт" },
      ],
      effects: { хлеб: 1, накрыто: 1 },
    },
    подать: {
      requires: [
        { key: "накрыто", min: 1, failure: "не_готово" },
        { key: "масло", min: 1, failure: "не_готово" },
        { key: "сыр", min: 1, failure: "не_готово" },
      ],
      effects: { подано: 1 },
    },
  },
  goalKey: "подано",
  failureRu: {
    нож_уже_в_руке: "нож уже был у меня в руке",
    хлеб_закончился: "ломтиков хлеба больше нет, их всего два",
    нет_ножа: "у меня в руке нет ножа, а рукой я масло не мажу",
    нет_хлеба: "на тарелке нет хлеба, мазать не на что",
    уже_намазано: "масло я уже намазал",
    сэндвич_уже_закрыт: "сэндвич уже накрыт сверху, внутрь не добраться",
    не_готово: "подавать нечего, сэндвич ещё не собран",
  },
  missingRu: [
    { key: "масло", min: 1, textRu: "масло не намазано" },
    { key: "сыр", min: 1, textRu: "сыр не положен" },
    { key: "накрыто", min: 1, textRu: "сверху не накрыто" },
    { key: "подано", min: 1, textRu: "я не подал сэндвич" },
  ],
  doneRu: "Сэндвич собран и подан. Порядок шагов был верный.",
};

/**
 * Week 2 · session 2 — planting, where the missing step is invisible until later.
 * Chosen over another kitchen task on purpose: a seed put into dry soil looks fine for two
 * steps and fails at the end, which is what a forgotten step actually feels like.
 */
export const PLANT_WORLD: SequenceWorld = {
  ...PUBLIC_SEQUENCE_WORLDS.plant,
  initial: { горшок: 0, земля: 0, ямка: 0, семечко: 0, закопано: 0, полито: 0, на_свету: 0 },
  rules: {
    взять_горшок: {
      requires: [{ key: "горшок", max: 0, failure: "горшок_уже_в_руках" }],
      effects: { горшок: 1 },
    },
    насыпать_землю: {
      requires: [
        { key: "горшок", min: 1, failure: "нет_горшка" },
        { key: "земля", max: 0, failure: "земля_уже_насыпана" },
      ],
      effects: { земля: 1 },
    },
    выкопать_ямку: {
      requires: [
        { key: "земля", min: 1, failure: "копать_нечего" },
        { key: "ямка", max: 0, failure: "ямка_уже_есть" },
      ],
      effects: { ямка: 1 },
    },
    положить_семечко: {
      requires: [
        { key: "ямка", min: 1, failure: "некуда_класть" },
        { key: "семечко", max: 0, failure: "семечко_уже_в_земле" },
      ],
      effects: { семечко: 1 },
    },
    закопать: {
      requires: [
        { key: "семечко", min: 1, failure: "закапывать_нечего" },
        { key: "закопано", max: 0, failure: "уже_закопано" },
      ],
      effects: { закопано: 1 },
    },
    полить: {
      requires: [
        { key: "земля", min: 1, failure: "лить_некуда" },
        { key: "полито", max: 0, failure: "уже_полито" },
      ],
      effects: { полито: 1 },
    },
    поставить_на_свет: {
      requires: [
        { key: "закопано", min: 1, failure: "росток_не_посажен" },
        { key: "полито", min: 1, failure: "сухая_земля" },
      ],
      effects: { на_свету: 1 },
    },
  },
  goalKey: "на_свету",
  failureRu: {
    горшок_уже_в_руках: "горшок уже у меня в руках",
    нет_горшка: "мне не во что сыпать, горшка в руках нет",
    земля_уже_насыпана: "земля уже насыпана",
    копать_нечего: "в пустом горшке копать нечего",
    ямка_уже_есть: "ямка уже выкопана",
    некуда_класть: "класть некуда, ямки нет",
    семечко_уже_в_земле: "семечко уже лежит в ямке, а оно одно",
    закапывать_нечего: "закапывать нечего, семечка в ямке нет",
    уже_закопано: "я уже закопал",
    лить_некуда: "лить некуда, в горшке нет земли",
    уже_полито: "я уже полил",
    росток_не_посажен: "нести на свет пустой горшок незачем, семечко не посажено",
    сухая_земля: "земля сухая, на свету семечко засохнет",
  },
  missingRu: [
    { key: "семечко", min: 1, textRu: "семечко так и не легло в ямку" },
    { key: "закопано", min: 1, textRu: "ямка осталась открытой" },
    { key: "полито", min: 1, textRu: "земля сухая" },
    { key: "на_свету", min: 1, textRu: "горшок так и стоит в тени" },
  ],
  doneRu: "Семечко в земле, земля влажная, горшок на свету. Порядок шагов был верный.",
};

/**
 * Week 2 · session 3 — leaving the house, where the order is not fixed by physics but by
 * consequence. Boots before the coat is fine; the door before the key is not. This is the
 * session that asks a child to decompose a goal they own themselves.
 */
export const LEAVING_WORLD: SequenceWorld = {
  ...PUBLIC_SEQUENCE_WORLDS.leaving,
  initial: { ботинки: 0, куртка: 0, рюкзак: 0, ключи: 0, дверь_открыта: 0, снаружи: 0, заперто: 0 },
  rules: {
    надеть_ботинки: {
      requires: [
        { key: "ботинки", max: 0, failure: "ботинки_уже_на_мне" },
        { key: "снаружи", max: 0, failure: "уже_на_улице" },
      ],
      effects: { ботинки: 1 },
    },
    надеть_куртку: {
      requires: [
        { key: "куртка", max: 0, failure: "куртка_уже_на_мне" },
        { key: "рюкзак", max: 0, failure: "рюкзак_мешает" },
      ],
      effects: { куртка: 1 },
    },
    взять_рюкзак: {
      requires: [{ key: "рюкзак", max: 0, failure: "рюкзак_уже_на_мне" }],
      effects: { рюкзак: 1 },
    },
    взять_ключи: {
      requires: [
        { key: "ключи", max: 0, failure: "ключи_уже_у_меня" },
        { key: "снаружи", max: 0, failure: "ключи_остались_дома" },
      ],
      effects: { ключи: 1 },
    },
    открыть_дверь: {
      requires: [
        { key: "дверь_открыта", max: 0, failure: "дверь_уже_открыта" },
        { key: "заперто", max: 0, failure: "дверь_заперта" },
      ],
      effects: { дверь_открыта: 1 },
    },
    выйти: {
      requires: [
        { key: "дверь_открыта", min: 1, failure: "дверь_закрыта" },
        { key: "ботинки", min: 1, failure: "босиком" },
        { key: "куртка", min: 1, failure: "холодно" },
        { key: "снаружи", max: 0, failure: "уже_на_улице" },
      ],
      effects: { снаружи: 1 },
    },
    закрыть_дверь: {
      requires: [
        { key: "снаружи", min: 1, failure: "я_ещё_дома" },
        { key: "ключи", min: 1, failure: "нечем_запирать" },
      ],
      effects: { дверь_открыта: -1, заперто: 1 },
    },
  },
  goalKey: "заперто",
  failureRu: {
    ботинки_уже_на_мне: "ботинки уже на мне",
    куртка_уже_на_мне: "куртка уже на мне",
    рюкзак_мешает: "рюкзак уже на спине, куртку через него не надеть",
    рюкзак_уже_на_мне: "рюкзак уже на мне",
    ключи_уже_у_меня: "ключи уже у меня",
    ключи_остались_дома: "я на улице, а ключи на полке в прихожей",
    дверь_уже_открыта: "дверь уже открыта",
    дверь_заперта: "дверь заперта, я уже её закрыл",
    дверь_закрыта: "дверь закрыта, выйти сквозь неё я не могу",
    босиком: "я босиком, на улицу так не пойду",
    холодно: "на улице холодно, без куртки я не выйду",
    уже_на_улице: "я уже на улице",
    я_ещё_дома: "я ещё дома, закрывать дверь снаружи мне рано",
    нечем_запирать: "ключей у меня нет, дверь так и останется открытой",
  },
  missingRu: [
    { key: "ботинки", min: 1, textRu: "я так и не обулся" },
    { key: "ключи", min: 1, textRu: "ключи остались на полке" },
    { key: "снаружи", min: 1, textRu: "я не вышел" },
    { key: "заперто", min: 1, textRu: "дверь осталась открытой" },
  ],
  doneRu: "Я одет, на улице, дверь заперта. Порядок шагов был верный.",
};

export const SEQUENCE_WORLDS: Record<string, SequenceWorld> = {
  [SANDWICH_WORLD.id]: SANDWICH_WORLD,
  [PLANT_WORLD.id]: PLANT_WORLD,
  [LEAVING_WORLD.id]: LEAVING_WORLD,
};

/** Unknown ids fall back to the sandwich rather than throwing at a child mid-task. */
export function sequenceWorld(id?: string | null): SequenceWorld {
  return (id && SEQUENCE_WORLDS[id]) || SANDWICH_WORLD;
}

/** Back-compat for callers that predate multiple worlds. */
export const SEQUENCE_ACTIONS = SANDWICH_WORLD.actions;

export type SequenceFailure = {
  index: number;
  action: string;
  code: string;
};

export type WorldState = Record<string, number>;

export type SequenceExecuteResult = {
  world: SequenceWorld;
  state: WorldState;
  done: string[];
  failure: SequenceFailure | null;
};

export type SequenceVerdict = {
  pass: boolean;
  failure: SequenceFailure | null;
  state: WorldState;
};

function firstUnmet(rule: SequenceRule, state: WorldState): string | null {
  for (const need of rule.requires ?? []) {
    const value = state[need.key] ?? 0;
    if (need.min !== undefined && value < need.min) return need.failure;
    if (need.max !== undefined && value > need.max) return need.failure;
  }
  return null;
}

/** Pure. Runs until the first impossible step, then stops. */
export function executeSequence(
  program: { steps: string[] },
  world: SequenceWorld = SANDWICH_WORLD
): SequenceExecuteResult {
  let state: WorldState = { ...world.initial };
  const done: string[] = [];
  for (const [index, action] of program.steps.entries()) {
    const rule = world.rules[action];
    if (!rule) {
      return { world, state, done, failure: { index, action, code: "неизвестное_действие" } };
    }
    const code = firstUnmet(rule, state);
    if (code) return { world, state, done, failure: { index, action, code } };
    state = { ...state };
    for (const [key, delta] of Object.entries(rule.effects)) {
      state[key] = (state[key] ?? 0) + delta;
    }
    done.push(action);
  }
  return { world, state, done, failure: null };
}

export function checkSequence(result: SequenceExecuteResult): SequenceVerdict {
  return {
    pass: result.failure === null && (result.state[result.world.goalKey] ?? 0) > 0,
    failure: result.failure,
    state: result.state,
  };
}

/** Monster's voice. Never blames the child. */
export function renderSequenceDiff(
  result: SequenceExecuteResult,
  verdict: SequenceVerdict
): string {
  const world = result.world;
  const lines: string[] = [];
  if (result.done.length) {
    lines.push(`  Я успел сделать: ${result.done.join(" → ")}`);
  } else {
    lines.push("  Я не смог начать.");
  }

  if (verdict.pass) {
    lines.push(`  ${world.doneRu}`);
    return lines.join("\n");
  }

  if (result.failure) {
    const { index, action, code } = result.failure;
    const why = world.failureRu[code] ?? (code === "неизвестное_действие" ? "такого действия я не умею" : code);
    lines.push(`  На шаге ${index + 1} ты сказал «${action}», и я застрял: ${why}.`);
  } else {
    const missing = world.missingRu
      .filter((m) => (result.state[m.key] ?? 0) < m.min)
      .map((m) => m.textRu);
    lines.push(`  Шаги закончились, а дела нет: ${missing.join(", ")}. Ты не сказал мне про это.`);
  }
  return lines.join("\n");
}

export function sequenceWorldPrompt(world: SequenceWorld = SANDWICH_WORLD): string {
  return `${world.sceneRu}
Монстр умеет выполнять только эти действия и никакие другие:
${world.actions.map((a) => `- ${a}`).join("\n")}
Монстр выполняет действия строго в том порядке, в котором их назвали, и останавливается,
если действие физически невозможно.`;
}

/** Back-compat for callers that predate multiple worlds. */
export const SEQUENCE_WORLD_PROMPT = sequenceWorldPrompt(SANDWICH_WORLD);

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
