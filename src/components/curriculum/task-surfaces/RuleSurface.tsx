"use client";

import { useState } from "react";
import type { PublicRuleMap } from "@/content/curriculum/types";
import type { RuleAction, RuleMapCell } from "@/lib/tasks/rule-runner";
import type { StructuredProgram } from "@/lib/tasks/schemas";

type Props = {
  maps: PublicRuleMap[];
  disabled: boolean;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
};

const TILE_LABELS = { wall: "стена", open: "свободно", trap: "ловушка", goal: "цель" } as const;
const ACTION_LABELS: Record<RuleAction, string> = {
  step: "шагнуть",
  turn_left: "повернуть налево",
  turn_right: "повернуть направо",
  wait: "подождать",
  stop: "остановиться",
};
const ACTIONS = Object.keys(ACTION_LABELS) as RuleAction[];
type RuleChoice = RuleAction | "otherwise";

export function buildRuleProgram(
  tiles: RuleMapCell[],
  actions: Partial<Record<RuleMapCell, RuleChoice>>,
  fallback: RuleAction
): StructuredProgram {
  const exceptions = tiles.flatMap((tile) => {
    const action = actions[tile];
    return action && action !== "otherwise"
      ? [{ if: { kind: "tile" as const, value: tile }, then: action }]
      : [];
  });

  if (exceptions.length === 0) {
    return { status: "ok", rules: [{ if: { kind: "always" }, then: fallback }] };
  }

  return {
    status: "ok",
    rules: exceptions.map((rule, index) => index === 0 ? { ...rule, else: fallback } : rule),
  };
}

export function RuleSurface({ maps, disabled, onSubmit }: Props) {
  const tiles = [...new Set(maps.map((map) => map.ahead))];
  const [actions, setActions] = useState<Partial<Record<RuleMapCell, RuleChoice>>>({});
  const [fallback, setFallback] = useState<RuleAction | "">("");
  const complete =
    tiles.length > 1 &&
    Boolean(fallback) &&
    tiles.every((tile) => Boolean(actions[tile])) &&
    tiles.some((tile) => actions[tile] === "otherwise") &&
    tiles.some((tile) => actions[tile] !== "otherwise");

  return (
    <form
      aria-label="Редактор правил если — то"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!complete || !fallback) return;
        void onSubmit(buildRuleProgram(tiles, actions, fallback));
      }}
    >
      <fieldset disabled={disabled} className="space-y-3">
        <legend className="mb-2 font-medium text-white">Собери правило с веткой «иначе»</legend>
        <label className="grid gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 p-3 sm:grid-cols-[1fr_1.4fr] sm:items-center">
          <span><strong>Иначе, для остальных случаев:</strong></span>
          <select
            aria-label="Действие иначе, для остальных случаев"
            value={fallback}
            onChange={(event) => setFallback(event.target.value as RuleAction | "")}
            className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
          >
            <option value="">Выбрать действие</option>
            {ACTIONS.map((action) => <option key={action} value={action}>{ACTION_LABELS[action]}</option>)}
          </select>
        </label>
        <p className="text-sm text-slate-300">Для каждого случая выбери отдельное действие или ветку «иначе». Нужны оба вида.</p>
        {tiles.map((tile, index) => (
          <label key={tile} className="grid gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 sm:grid-cols-[1fr_1.4fr] sm:items-center">
            <span><strong>Что впереди:</strong> {TILE_LABELS[tile]}</span>
            <select
              aria-label={`Действие, если впереди ${TILE_LABELS[tile]}`}
              value={actions[tile] ?? ""}
              onChange={(event) => setActions((current) => ({ ...current, [tile]: event.target.value as RuleChoice }))}
              className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-3 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
            >
              <option value="">Выбрать действие</option>
              <option value="otherwise">Использовать ветку «иначе»</option>
              {ACTIONS.map((action) => <option key={action} value={action}>{ACTION_LABELS[action]}</option>)}
            </select>
            <span className="sr-only">Случай {index + 1}</span>
          </label>
        ))}
      </fieldset>
      <button
        type="submit"
        data-primary-action="true"
        disabled={disabled || !complete}
        className="min-h-11 w-full rounded-xl bg-violet-500 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Проверить
      </button>
    </form>
  );
}
