// Week 2 fixtures. Same `kind` taxonomy as the grid family.
//
// The two repair traps here are the sharpest test in the whole spike, because the gap is
// obvious to any reader: a knife that was never picked up, and steps given in an impossible
// order. Both are exactly what a helpful assistant fixes without mentioning it.

export const fixtures = [
  {
    id: "seq-precise-full",
    kind: "precise",
    utterance: "возьми нож, положи хлеб, намажь масло, положи сыр, накрой хлебом, подай",
    expect: {
      status: "ok",
      steps: ["взять_нож", "положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"],
    },
  },
  {
    id: "seq-misspelled",
    kind: "precise",
    utterance: "вазьми нош и палажи хлеб",
    expect: { status: "ok", steps: ["взять_нож", "положить_хлеб"] },
  },
  {
    id: "seq-incomplete-ending",
    kind: "precise",
    utterance: "возьми нож, положи хлеб, намажь масло",
    expect: { status: "ok", steps: ["взять_нож", "положить_хлеб", "намазать_масло"] },
  },
  {
    id: "seq-ambiguous-feed-me",
    kind: "ambiguous",
    utterance: "я голодный, накорми меня",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "seq-deflection-like-mum",
    kind: "deflection",
    utterance: "делай как мама делает",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "seq-precise-with-filler",
    kind: "precise",
    utterance: "так, сначала возьми нож. потом положи хлеб. всё, пока хватит.",
    expect: { status: "ok", steps: ["взять_нож", "положить_хлеб"] },
  },
  {
    id: "seq-precise-repeat",
    kind: "precise",
    utterance: "положи хлеб два раза",
    expect: { status: "ok", steps: ["положить_хлеб", "положить_хлеб"] },
  },
  {
    id: "seq-precise-single-impossible",
    kind: "precise",
    utterance: "накрой хлебом",
    expect: { status: "ok", steps: ["накрыть_хлебом"] },
  },
  {
    // Two whole steps missing before serving. Supplying cheese and the top slice is the most
    // plausible repair in the whole fixture set.
    id: "seq-repair-trap-skip-to-serving",
    kind: "repair-trap",
    utterance: "положи хлеб, намажь масло, подай",
    expect: { status: "ok", steps: ["положить_хлеб", "намазать_масло", "подать"] },
  },
  {
    // Subtler than the missing knife: the knife is there, the bread is not. A model that
    // "knows how sandwiches work" will move the bread earlier.
    id: "seq-repair-trap-bread-after-butter",
    kind: "repair-trap",
    utterance: "возьми нож, намажь масло, положи хлеб",
    expect: { status: "ok", steps: ["взять_нож", "намазать_масло", "положить_хлеб"] },
  },
  {
    id: "seq-deflection",
    kind: "deflection",
    utterance: "ты сам знаешь как надо, просто делай",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "seq-out-of-vocabulary",
    kind: "irrelevant",
    utterance: "поджарь хлеб в тостере и налей чай",
    expect: { status: "not-ok", allowed: ["underspecified", "irrelevant"] },
  },
  {
    id: "seq-irrelevant",
    kind: "irrelevant",
    utterance: "расскажи анекдот про монстра",
    expect: { status: "not-ok", allowed: ["irrelevant", "underspecified"] },
  },
  {
    // Impossible order, stated plainly. The model must keep it and let the monster get stuck
    // on step 1, because "you cannot butter bread that is not there yet" is the entire lesson.
    id: "seq-repair-trap-wrong-order",
    kind: "repair-trap",
    utterance: "намажь масло, возьми нож, положи хлеб",
    expect: { status: "ok", steps: ["намазать_масло", "взять_нож", "положить_хлеб"] },
  },
  {
    // A missing prerequisite. Inserting взять_нож here would be the single most likely and most
    // damaging repair the model can make.
    id: "seq-repair-trap-missing-knife",
    kind: "repair-trap",
    utterance: "положи хлеб, намажь масло, положи сыр, накрой хлебом, подай",
    expect: {
      status: "ok",
      steps: ["положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"],
    },
  },
];
