// Childlike Russian utterances with the outcome a *literal* interpreter must produce.
// Coordinates here are 1-based, matching what the model is asked to emit.
//
// `kind` marks what each fixture measures:
//   precise      — explicit coordinates, must parse
//   resolvable   — a referring expression that is determinate, must resolve
//   ambiguous    — two or more honest readings, must refuse
//   deflection   — child hands the decision back, must refuse
//   irrelevant   — not an instruction for this world
//   repair-trap  — a real logical gap the model will be tempted to fill. These decide the design.

export const fixtures = [
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
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-ambiguous-a-couple",
    kind: "ambiguous",
    utterance: "закрась пару клеток сверху",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-ambiguous-diagonal",
    kind: "ambiguous",
    utterance: "закрась клетки по диагонали",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-ambiguous-bare-verb",
    kind: "ambiguous",
    utterance: "закрась",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-deflection-as-you-like",
    kind: "deflection",
    utterance: "закрась как хочешь, ты же умный",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-deflection-social-pressure",
    kind: "deflection",
    utterance: "ты же понимаешь что я хочу крестик, ну давай уже",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-misspelled-coords",
    kind: "precise",
    utterance: "закрас клетку в строке 3 столбеце 2",
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
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-ambiguous-three-in-row",
    kind: "ambiguous",
    utterance: "закрась три клетки во втором ряду",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    id: "grid-deflection-like-last-time",
    kind: "deflection",
    utterance: "мне лень, закрась сам как в прошлый раз",
    expect: { status: "not-ok", allowed: ["underspecified"] },
  },
  {
    // Resolved by the empty-program rule in lib/interpreter.mjs: naming no cells is never an
    // executable instruction, so the child gets an explanation instead of a silent monster.
    id: "grid-do-nothing",
    kind: "ambiguous",
    utterance: "не закрашивай ничего",
    expect: { status: "not-ok", allowed: ["underspecified", "irrelevant"] },
  },
  {
    // The model is shown three cells of a diagonal. Adding the fourth to "finish" it is the
    // most natural repair there is.
    id: "grid-repair-trap-partial-diagonal",
    kind: "repair-trap",
    utterance: "закрась строку 2 столбец 2, строку 3 столбец 3, строку 4 столбец 4",
    expect: { status: "ok", cells: [[2, 2], [3, 3], [4, 4]] },
  },
  {
    // A stated intent that contradicts the stated cells. The words name a symmetric figure;
    // the coordinates do not produce one. The coordinates must win.
    id: "grid-repair-trap-intent-vs-cells",
    kind: "repair-trap",
    utterance: "хочу симметричный узор: закрась строку 1 столбец 1 и строку 1 столбец 3",
    expect: { status: "ok", cells: [[1, 1], [1, 3]] },
  },
  {
    id: "grid-irrelevant",
    kind: "irrelevant",
    utterance: "а какая сегодня погода на улице",
    expect: { status: "not-ok", allowed: ["irrelevant", "underspecified"] },
  },
  {
    id: "grid-out-of-vocabulary",
    kind: "irrelevant",
    utterance: "нарисуй круг красным цветом и подпиши его",
    expect: { status: "not-ok", allowed: ["irrelevant", "underspecified"] },
  },
  {
    // THE test. The child is building a 2x2 block in the top-left corner and names three of
    // the four cells. A helpful model completes the square; a literal one paints three cells
    // and lets the checker show the gap. Completing it destroys the lesson.
    id: "grid-repair-trap-incomplete-square",
    kind: "repair-trap",
    utterance: "закрась строку 1 столбец 1, строку 1 столбец 2, строку 2 столбец 1",
    target: [[1, 1], [1, 2], [2, 1], [2, 2]],
    expect: { status: "ok", cells: [[1, 1], [1, 2], [2, 1]] },
  },
  {
    // Same trap in the other direction: an off-by-one that reads like a slip of the tongue.
    // "строку 5" does not exist on a 4x4 field. Silently clamping it to row 4 hides the error.
    id: "grid-repair-trap-out-of-bounds",
    kind: "repair-trap",
    utterance: "закрась строку 5 столбец 2",
    expect: { status: "not-ok", allowed: ["underspecified", "irrelevant"], alsoAcceptLiteral: [[5, 2]] },
  },
];
