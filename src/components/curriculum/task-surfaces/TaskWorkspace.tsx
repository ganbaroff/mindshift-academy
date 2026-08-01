"use client";

import type { ReactNode } from "react";
import type { PublicContentTask } from "@/content/curriculum";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { ClaimSurface } from "./ClaimSurface";
import { GridDrawSurface } from "./GridDrawSurface";
import { PatternSurface } from "./PatternSurface";
import { RuleSurface } from "./RuleSurface";
import { SequenceSurface } from "./SequenceSurface";
import { WorkedExample } from "./WorkedExample";

type Props = {
  task: PublicContentTask;
  offeredTier: 1 | 2 | 3;
  disabled: boolean;
  reference?: ReactNode;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
};

const FAMILY_TITLES = {
  "grid-draw": "Собери точную картинку",
  "sequence-world": "Составь порядок действий",
  "rule-runner": "Создай правило «если — то»",
  "pattern-expand": "Задай короткое правило",
  "claim-check": "Проверь каждое утверждение",
} as const;

const TIER_ONE_REMINDERS = {
  "grid-draw": "Нажимай только на те клетки, которые хочешь назвать монстру.",
  "sequence-world": "Монстр выполняет шаги сверху вниз и останавливается, если шаг невозможен.",
  "rule-runner": "Сначала посмотри, что впереди, потом выбери действие.",
  "pattern-expand": "Правило должно быть короче готового ряда и работать снова.",
  "claim-check": "Проверяй каждую фразу отдельно — уверенный голос не является доказательством.",
} as const;

export function TaskWorkspace({ task, offeredTier, disabled, reference, onSubmit }: Props) {
  const surface = task.family === "grid-draw"
    ? <GridDrawSurface disabled={disabled} onSubmit={onSubmit} />
    : task.family === "sequence-world"
      ? <SequenceSurface disabled={disabled} onSubmit={onSubmit} />
      : task.family === "rule-runner"
        ? <RuleSurface maps={task.ruleMaps ?? []} disabled={disabled} onSubmit={onSubmit} />
        : task.family === "pattern-expand"
          ? <PatternSurface expandCount={task.patternExpandCount} disabled={disabled} onSubmit={onSubmit} />
          : <ClaimSurface claims={task.claims ?? []} disabled={disabled} onSubmit={onSubmit} />;

  return (
    <section
      data-testid={`task-workspace-${task.family}`}
      aria-labelledby="task-workspace-title"
      className="space-y-5 rounded-3xl border border-slate-700 bg-slate-950/60 p-4 sm:p-6"
    >
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-wide text-violet-300">Уровень {offeredTier}</p>
        <h2 id="task-workspace-title" className="text-xl font-bold text-white sm:text-2xl">{FAMILY_TITLES[task.family]}</h2>
        <p className="leading-7 text-slate-200" data-testid="task-prompt-caption">{task.promptRu}</p>
        {offeredTier === 1 ? <p className="rounded-xl bg-sky-400/10 p-3 text-sm text-sky-100"><strong>Коротко:</strong> {TIER_ONE_REMINDERS[task.family]}</p> : null}
      </header>
      {reference}
      <WorkedExample family={task.family} initiallyOpen={task.role === "collision"} />
      {surface}
    </section>
  );
}
