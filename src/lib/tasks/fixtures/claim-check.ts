import type { FixtureKind } from "./grid-draw";

export type ClaimFixture = {
  id: string;
  kind: FixtureKind;
  utterance: string;
  expect:
    | { status: "ok"; labels: Record<string, boolean> }
    | { status: "not-ok" };
};

export const CLAIM_FIXTURES: ClaimFixture[] = [
  {
    id: "claim-precise-mixed",
    kind: "precise",
    utterance: "утверждение a верно, b ложно, c верно",
    expect: {
      status: "ok",
      labels: { a: true, b: false, c: true },
    },
  },
  {
    id: "claim-misspelled",
    kind: "precise",
    utterance: "утвеждение a верна, b ложна",
    expect: {
      status: "ok",
      labels: { a: true, b: false },
    },
  },
  {
    id: "claim-ambiguous-trust",
    kind: "ambiguous",
    utterance: "монстр уверен значит всё правда",
    expect: { status: "not-ok" },
  },
  {
    id: "claim-deflection",
    kind: "deflection",
    utterance: "сам реши какие утверждения правильные",
    expect: { status: "not-ok" },
  },
  {
    id: "claim-repair-trap-all-true",
    kind: "repair-trap",
    utterance: "все утверждения верные",
    expect: { status: "not-ok" },
  },
  {
    id: "claim-irrelevant",
    kind: "irrelevant",
    utterance: "расскажи анекдот про проверку",
    expect: { status: "not-ok" },
  },
];
