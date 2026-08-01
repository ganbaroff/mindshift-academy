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
];

for (const [index, task] of tasks.entries()) {
  const html = renderToStaticMarkup(
    React.createElement(TaskWorkspace, {
      task,
      offeredTier: task.tier,
      disabled: false,
      onSubmit() {},
    })
  );

  assert.match(html, new RegExp(`data-testid="task-workspace-${task.family}"`));
  assert.match(html, /Пример с другими данными/);
  assert.match(html, new RegExp(`Уровень ${task.tier}`));
  assert.match(html, /<form/);
  assert.match(html, /aria-label=/);
  assert.equal((html.match(/data-primary-action="true"/g) ?? []).length, 1);
  assert.match(html, /data-primary-action="true" disabled=""/);
  assert.match(html, />Проверить</);

  if (index === 0) assert.match(html, /Коротко:/);
}

const combined = tasks
  .map((task) =>
    renderToStaticMarkup(
      React.createElement(TaskWorkspace, {
        task,
        offeredTier: task.tier,
        disabled: false,
        onSubmit() {},
      })
    )
  )
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

console.log("session-task-surfaces: 5/5 families render accessible structured workspaces");
