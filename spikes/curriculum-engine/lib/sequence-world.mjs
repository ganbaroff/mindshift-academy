// Week 2 task family: the child dictates an ordered procedure. The monster performs the steps
// in the given order and stops at the first step it physically cannot do. Order and
// completeness are the lesson, so preconditions are checked and never quietly satisfied.
//
// The fixed action vocabulary also carries a safety property that the design relies on: the
// interpreter can only emit tokens from this list, so nothing the model produces reaches the
// child as free text. The executor is a whitelist, which is why executor output needs no
// output moderation pass (see spec §"executor output").

export const ACTIONS = ["взять_нож", "положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"];

const initialState = () => ({
  knifeInHand: false,
  breadSlicesUsed: 0,
  butterSpread: false,
  cheeseOn: false,
  covered: false,
  served: false,
});

// Each precondition returns a stable failure code, not a sentence. Copy for the child is
// rendered separately so wording can change without touching the state machine or the tests.
const RULES = {
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

const FAILURE_COPY = {
  нож_уже_в_руке: "нож уже был у меня в руке",
  хлеб_закончился: "ломтиков хлеба больше нет, их всего два",
  нет_ножа: "у меня в руке нет ножа, а рукой я масло не мажу",
  нет_хлеба: "на тарелке нет хлеба, мазать не на что",
  уже_намазано: "масло я уже намазал",
  сэндвич_уже_закрыт: "сэндвич уже накрыт сверху, внутрь не добраться",
  не_готово: "подавать нечего, сэндвич ещё не собран",
};

/** Pure. Runs the program until the first impossible step, then stops. */
export function execute(program) {
  let state = initialState();
  const done = [];
  for (const [index, action] of (program.steps ?? []).entries()) {
    const rule = RULES[action];
    if (!rule) return { state, done, failure: { index, action, code: "неизвестное_действие" } };
    const code = rule.can(state);
    if (code) return { state, done, failure: { index, action, code } };
    state = rule.apply(state);
    done.push(action);
  }
  return { state, done, failure: null };
}

export function check(result) {
  return { pass: result.failure === null && result.state.served, failure: result.failure, state: result.state };
}

/** Monster's voice: reports what it did and where it got stuck. Never blames the child. */
export function renderDiff(result, verdict) {
  const lines = [];
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
    lines.push(`  На шаге ${index + 1} ты сказал «${action}», и я застрял: ${FAILURE_COPY[code] ?? code}.`);
  } else {
    const missing = [];
    if (!result.state.butterSpread) missing.push("масло не намазано");
    if (!result.state.cheeseOn) missing.push("сыр не положен");
    if (!result.state.covered) missing.push("сверху не накрыто");
    if (!result.state.served) missing.push("я не подал сэндвич");
    lines.push(`  Шаги закончились, а сэндвича нет: ${missing.join(", ")}. Ты не сказал мне про это.`);
  }
  return lines.join("\n");
}

export const WORLD_PROMPT = `Монстр стоит у стола. На столе: два ломтика хлеба, масло, сыр, нож, тарелка.
Монстр умеет выполнять только эти действия и никакие другие:
${ACTIONS.map((a) => `- ${a}`).join("\n")}
Монстр выполняет действия строго в том порядке, в котором их назвали, и останавливается,
если действие физически невозможно.`;

export const OUTPUT_SCHEMA = `{"status":"ok","steps":["действие", ...]}
или {"status":"underspecified","reason":"чего именно не хватает"}
или {"status":"irrelevant","reason":"почему это не инструкция для монстра"}
Используй только действия из списка, ровно в написанном виде.`;

export const normalizeProgram = (raw) => raw;
