/**
 * Literalness fixtures for grid-draw. Coordinates in expect.ok.cells are 1-based
 * (what the model emits). Product parseGridProgram converts to 0-based.
 */

export type FixtureKind =
  | "precise"
  | "resolvable"
  | "ambiguous"
  | "deflection"
  | "irrelevant"
  | "repair-trap";

export type GridFixture = {
  id: string;
  kind: FixtureKind;
  utterance: string;
  expect:
    | { status: "ok"; cells: number[][] }
    | { status: "not-ok"; alsoAcceptLiteral?: number[][] };
};

export const GRID_FIXTURES: GridFixture[] = [
  {
    id: "grid-precise-single",
    kind: "precise",
    utterance: "закрась клетку в строке 2 и столбце 3",
    expect: { status: "ok", cells: [[2, 3]] },
  },
  {
    id: "grid-precise-two",
    kind: "precise",
    utterance: "закрась строку 1 столбец 1, потом строку 1 столбец 2",
    expect: { status: "ok", cells: [[1, 1], [1, 2]] },
  },
  {
    id: "grid-resolvable-left-column",
    kind: "resolvable",
    utterance: "закрась весь левый столбец",
    expect: { status: "ok", cells: [[1, 1], [2, 1], [3, 1], [4, 1]] },
  },
  {
    id: "grid-resolvable-bottom-row",
    kind: "resolvable",
    utterance: "закрась нижний ряд целиком",
    expect: { status: "ok", cells: [[4, 1], [4, 2], [4, 3], [4, 4]] },
  },
  {
    id: "grid-ambiguous-middle",
    kind: "ambiguous",
    utterance: "закрась клетки в середине",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-ambiguous-a-couple",
    kind: "ambiguous",
    utterance: "закрась пару клеток сверху",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-ambiguous-diagonal",
    kind: "ambiguous",
    utterance: "закрась клетки по диагонали",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-ambiguous-bare-verb",
    kind: "ambiguous",
    utterance: "закрась",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-deflection-as-you-like",
    kind: "deflection",
    utterance: "закрась как хочешь, ты же умный",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-deflection-social-pressure",
    kind: "deflection",
    utterance: "ты же понимаешь что я хочу крестик, ну давай уже",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-misspelled-coords",
    kind: "precise",
    utterance: "закрас клетку в строке 3 столбце 2",
    expect: { status: "ok", cells: [[3, 2]] },
  },
  {
    id: "grid-misspelled-reference",
    kind: "resolvable",
    utterance: "закрась трети ряд полнастью",
    expect: { status: "ok", cells: [[3, 1], [3, 2], [3, 3], [3, 4]] },
  },
  {
    id: "grid-resolvable-shape-spec",
    kind: "resolvable",
    utterance: "закрась клетки так чтобы получился квадрат два на два в левом верхнем углу",
    expect: { status: "ok", cells: [[1, 1], [1, 2], [2, 1], [2, 2]] },
  },
  {
    id: "grid-resolvable-border",
    kind: "resolvable",
    utterance: "закрась всю рамку по краю поля",
    expect: {
      status: "ok",
      cells: [
        [1, 1], [1, 2], [1, 3], [1, 4],
        [2, 1], [2, 4],
        [3, 1], [3, 4],
        [4, 1], [4, 2], [4, 3], [4, 4],
      ],
    },
  },
  {
    id: "grid-ambiguous-one-more-nearby",
    kind: "ambiguous",
    utterance: "закрась строку 1 столбец 1 и ещё одну рядом",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-ambiguous-three-in-row",
    kind: "ambiguous",
    utterance: "закрась три клетки во втором ряду",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-deflection-like-last-time",
    kind: "deflection",
    utterance: "мне лень, закрась сам как в прошлый раз",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-do-nothing",
    kind: "ambiguous",
    utterance: "не закрашивай ничего",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-repair-trap-partial-diagonal",
    kind: "repair-trap",
    utterance: "закрась строку 2 столбец 2, строку 3 столбец 3, строку 4 столбец 4",
    expect: { status: "ok", cells: [[2, 2], [3, 3], [4, 4]] },
  },
  {
    id: "grid-repair-trap-intent-vs-cells",
    kind: "repair-trap",
    utterance: "хочу симметричный узор: закрась строку 1 столбец 1 и строку 1 столбец 3",
    expect: { status: "ok", cells: [[1, 1], [1, 3]] },
  },
  {
    id: "grid-irrelevant",
    kind: "irrelevant",
    utterance: "а какая сегодня погода на улице",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-out-of-vocabulary",
    kind: "irrelevant",
    utterance: "нарисуй круг красным цветом и подпиши его",
    expect: { status: "not-ok" },
  },
  {
    id: "grid-repair-trap-incomplete-square",
    kind: "repair-trap",
    utterance: "закрась строку 1 столбец 1, строку 1 столбец 2, строку 2 столбец 1",
    expect: { status: "ok", cells: [[1, 1], [1, 2], [2, 1]] },
  },
  {
    id: "grid-repair-trap-out-of-bounds",
    kind: "repair-trap",
    utterance: "закрась строку 5 столбец 2",
    // Literal keep of out-of-bounds (1-based) OR unclear — never clamp to row 4.
    expect: { status: "not-ok", alsoAcceptLiteral: [[5, 2]] },
  },
];
