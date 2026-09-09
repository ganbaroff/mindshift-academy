import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskWorkspace } from "../src/components/curriculum/task-surfaces/TaskWorkspace.tsx";
import { buildRuleProgram } from "../src/components/curriculum/task-surfaces/RuleSurface.tsx";
import { checkRuleRunner, executeRuleRunner } from "../src/lib/tasks/rule-runner.ts";

const tasks = [
  {
    id: "grid-current",
    role: "practice",
    family: "grid-draw",
    tier: 1,
    promptRu: "Закрась угол и центр на поле.",
    target: [[0, 0], [1, 1]],
    hintAvailable: true,
  },
  {
    id: "sequence-current",
    role: "practice",
    family: "sequence-world",
    tier: 1,
    promptRu: "Составь точный порядок действий.",
    hintAvailable: true,
  },
  {
    id: "rule-current",
    role: "practice",
    family: "rule-runner",
    tier: 2,
    promptRu: "Создай правило для каждой видимой клетки.",
    ruleMaps: [
      { id: "карта-стена", ahead: "wall" },
      { id: "карта-цель", ahead: "goal" },
    ],
    hintAvailable: true,
  },
  {
    id: "pattern-current",
    role: "practice",
    family: "pattern-expand",
    tier: 2,
    promptRu: "Задай короткое правило узора.",
    patternExpandCount: 6,
    hintAvailable: true,
  },
  {
    id: "claim-current",
    role: "practice",
    family: "claim-check",
    tier: 3,
    promptRu: "Проверь каждое утверждение.",
    claims: [
      { id: "current-a", text: "У робота два ключа." },
      { id: "current-b", text: "Дверь уже открыта." },
    ],
    hintAvailable: true,
  },
  {
    // The only family with a tier-3 demand line, so the zero-click side of the
    // disclosure contract below is actually exercised instead of vacuously true.
    id: "sequence-tier3",
    role: "practice",
    family: "sequence-world",
    tier: 3,
    promptRu: "Составь самый короткий план.",
    hintAvailable: true,
  },
];

/**
 * Sprint-1 folded the level heading, the free-text explanation and promptRu behind one
 * collapsed disclosure, while the tier-1 reminder and the tier-3 demand stayed on screen
 * with zero clicks (TaskWorkspace.tsx, "Tier contract" comment). Both halves are asserted
 * here: a surface that always showed everything and one that always hid everything would
 * both have satisfied the single collapsed render this test used to do — which is why it
 * went red on `Уровень N` and sat outside every gate instead of being fixed.
 */
const render = (task, showDisclosure) =>
  renderToStaticMarkup(
    React.createElement(TaskWorkspace, {
      task,
      offeredTier: task.tier,
      disabled: false,
      showDisclosure,
      onToggleDisclosure() {},
      onSubmit() {},
    })
  );

for (const task of tasks) {
  const collapsed = render(task, false);
  const expanded = render(task, true);

  for (const html of [collapsed, expanded]) {
    assert.match(html, new RegExp(`data-testid="task-workspace-${task.family}"`));
    assert.match(html, /<form/);
    assert.match(html, /aria-label=/);
    assert.equal((html.match(/data-primary-action="true"/g) ?? []).length, 1);
    assert.match(html, /data-primary-action="true" disabled=""/);
    assert.match(html, />Проверить</);
  }

  // The scaffold fades as the tier rises (WORKED_EXAMPLE_BY_TIER): shown open at tier 1,
  // folded at tier 2, gone at tier 3. Asserting mere presence — as this file used to —
  // would pass a build that handed a top-tier child the worked answer.
  const scaffold = { 1: "open", 2: "folded", 3: "none" }[task.tier];
  assert.match(collapsed, new RegExp(`data-worked-example="${scaffold}"`));
  if (scaffold === "none") {
    assert.doesNotMatch(collapsed, /Пример с другими данными/);
  } else {
    assert.match(collapsed, /Пример с другими данными/);
  }

  // Zero clicks: the one line that defines the tier is never behind a disclosure.
  if (task.tier === 1) assert.match(collapsed, /Коротко:/);
  if (task.tier === 3 && task.family === "sequence-world") {
    assert.match(collapsed, /Условие уровня 3:/);
  }

  // One click: the level heading is deliberately folded, and must still be reachable.
  assert.doesNotMatch(collapsed, new RegExp(`Уровень ${task.tier}`));
  assert.match(expanded, new RegExp(`Уровень ${task.tier}`));
}

const combined = tasks
  .flatMap((task) => [render(task, false), render(task, true)])
  .join("\n");

assert.doesNotMatch(combined, /current-a|current-b|grid-current|patternExpected|successWhen/);
assert.match(combined, /Выбрать клетку 1, 1/);
assert.match(combined, /Добавить действие/);
assert.match(combined, /Что впереди:/);
assert.match(combined, /Иначе, для остальных случаев/);
assert.match(combined, /Начальное число/);
assert.match(combined, /Утверждение:/);

assert.deepEqual(
  buildRuleProgram(
    ["wall", "open", "trap"],
    { wall: "wait", open: "otherwise", trap: "stop" },
    "step"
  ),
  {
    status: "ok",
    rules: [
      { if: { kind: "tile", value: "wall" }, then: "wait", else: "step" },
      { if: { kind: "tile", value: "trap" }, then: "stop" },
    ],
  },
  "rule workspace must encode an explicit otherwise branch plus exceptions"
);

const generalRule = buildRuleProgram(
  ["open", "wall", "trap", "goal"],
  { open: "otherwise", wall: "wait", trap: "stop", goal: "otherwise" },
  "step"
);
assert.equal(
  checkRuleRunner(
    executeRuleRunner(generalRule, [
      { id: "open", ahead: "open", successWhen: "goal" },
      { id: "wall", ahead: "wall", successWhen: "wait_on_wall" },
      { id: "trap", ahead: "trap", successWhen: "stop_on_trap" },
      { id: "goal", ahead: "goal", successWhen: "goal" },
    ])
  ).pass,
  true,
  "explicit exceptions plus the otherwise branch must generalize across all maps"
);

console.log(
  `session-task-surfaces: ${tasks.length} tasks across 5 families render accessible structured ` +
    "workspaces, collapsed and expanded, with the tier scaffold ladder intact"
);
