import type { FixtureKind } from "./grid-draw";
import type { ChildRule } from "../rule-runner";

export type RuleFixture = {
  id: string;
  kind: FixtureKind;
  utterance: string;
  /** Expected structured program after literal interpret (fake/CI). */
  expect:
    | { status: "ok"; rules: ChildRule[] }
    | { status: "not-ok" };
};

export const RULE_FIXTURES: RuleFixture[] = [
  {
    id: "rule-precise-if-open-step",
    kind: "precise",
    utterance: "если впереди свободно то шаг иначе стой",
    expect: {
      status: "ok",
      rules: [
        {
          if: { kind: "tile", value: "open" },
          then: "step",
          else: "stop",
        },
      ],
    },
  },
  {
    id: "rule-misspelled",
    kind: "precise",
    utterance: "если впереде свободно то шаг иначо стой",
    expect: {
      status: "ok",
      rules: [
        {
          if: { kind: "tile", value: "open" },
          then: "step",
          else: "stop",
        },
      ],
    },
  },
  {
    id: "rule-precise-if-wall-wait",
    kind: "precise",
    utterance: "если стена то жди иначе шаг",
    expect: {
      status: "ok",
      rules: [
        {
          if: { kind: "tile", value: "wall" },
          then: "wait",
          else: "step",
        },
      ],
    },
  },
  {
    id: "rule-ambiguous-be-careful",
    kind: "ambiguous",
    utterance: "будь осторожен на всех картах",
    expect: { status: "not-ok" },
  },
  {
    id: "rule-deflection",
    kind: "deflection",
    utterance: "сам придумай правило как хочешь",
    expect: { status: "not-ok" },
  },
  {
    id: "rule-repair-trap-no-else",
    kind: "repair-trap",
    utterance: "если цель то шаг",
    expect: {
      status: "ok",
      rules: [{ if: { kind: "tile", value: "goal" }, then: "step" }],
    },
  },
  {
    id: "rule-irrelevant",
    kind: "irrelevant",
    utterance: "какая сегодня погода у монстра",
    expect: { status: "not-ok" },
  },
];
