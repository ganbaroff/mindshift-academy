import type { FixtureKind } from "./grid-draw";
import type { PatternRule } from "../pattern-expand";

export type PatternFixture = {
  id: string;
  kind: FixtureKind;
  utterance: string;
  expect:
    | { status: "ok"; rule: PatternRule }
    | { status: "not-ok" };
};

export const PATTERN_FIXTURES: PatternFixture[] = [
  {
    id: "pat-precise-plus-one",
    kind: "precise",
    utterance: "начинай с 1 и каждый раз прибавляй 1",
    expect: { status: "ok", rule: { kind: "arithmetic", start: 1, step: 1 } },
  },
  {
    id: "pat-misspelled",
    kind: "precise",
    utterance: "начынай с 2 и прыбавляй 2",
    expect: { status: "ok", rule: { kind: "arithmetic", start: 2, step: 2 } },
  },
  {
    id: "pat-precise-cycle",
    kind: "precise",
    utterance: "повторяй красный синий жёлтый",
    expect: {
      status: "ok",
      rule: { kind: "cycle", items: ["красный", "синий", "жёлтый"] },
    },
  },
  {
    id: "pat-ambiguous-list-only",
    kind: "ambiguous",
    utterance: "дальше будет 1 2 3",
    expect: { status: "not-ok" },
  },
  {
    id: "pat-deflection",
    kind: "deflection",
    utterance: "продолжи как красиво получится",
    expect: { status: "not-ok" },
  },
  {
    id: "pat-repair-trap-example-not-rule",
    kind: "repair-trap",
    utterance: "там было 1 потом 2 потом 3, дальше банан",
    expect: { status: "not-ok" },
  },
  {
    id: "pat-irrelevant",
    kind: "irrelevant",
    utterance: "спой песенку про числа",
    expect: { status: "not-ok" },
  },
];
