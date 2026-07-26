import type { FixtureKind } from "./grid-draw";

export type SequenceFixture = {
  id: string;
  kind: FixtureKind;
  utterance: string;
  expect: { status: "ok"; steps: string[] } | { status: "not-ok" };
};

export const SEQUENCE_FIXTURES: SequenceFixture[] = [
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
    expect: { status: "not-ok" },
  },
  {
    id: "seq-deflection-like-mum",
    kind: "deflection",
    utterance: "делай как мама делает",
    expect: { status: "not-ok" },
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
    id: "seq-repair-trap-skip-to-serving",
    kind: "repair-trap",
    utterance: "положи хлеб, намажь масло, подай",
    expect: { status: "ok", steps: ["положить_хлеб", "намазать_масло", "подать"] },
  },
  {
    id: "seq-repair-trap-bread-after-butter",
    kind: "repair-trap",
    utterance: "возьми нож, намажь масло, положи хлеб",
    expect: { status: "ok", steps: ["взять_нож", "намазать_масло", "положить_хлеб"] },
  },
  {
    id: "seq-deflection",
    kind: "deflection",
    utterance: "ты сам знаешь как надо, просто делай",
    expect: { status: "not-ok" },
  },
  {
    id: "seq-out-of-vocabulary",
    kind: "irrelevant",
    utterance: "поджарь хлеб в тостере и налей чай",
    expect: { status: "not-ok" },
  },
  {
    id: "seq-irrelevant",
    kind: "irrelevant",
    utterance: "расскажи анекдот про монстра",
    expect: { status: "not-ok" },
  },
  {
    id: "seq-repair-trap-wrong-order",
    kind: "repair-trap",
    utterance: "намажь масло, возьми нож, положи хлеб",
    expect: { status: "ok", steps: ["намазать_масло", "взять_нож", "положить_хлеб"] },
  },
  {
    id: "seq-repair-trap-missing-knife",
    kind: "repair-trap",
    utterance: "положи хлеб, намажь масло, положи сыр, накрой хлебом, подай",
    expect: {
      status: "ok",
      steps: ["положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"],
    },
  },
];
