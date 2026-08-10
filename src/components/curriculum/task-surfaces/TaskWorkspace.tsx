"use client";

import { useCallback, useId } from "react";
import type { ReactNode } from "react";
import type { PublicContentTask } from "@/content/curriculum";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { ClaimSurface } from "./ClaimSurface";
import { GridDrawSurface } from "./GridDrawSurface";
import { PatternSurface } from "./PatternSurface";
import { RuleSurface } from "./RuleSurface";
import { SequenceSurface } from "./SequenceSurface";
import { WorkedExample } from "./WorkedExample";

export type TaskPrimaryActionState = {
  formId: string;
  ready: boolean;
};

type Props = {
  task: PublicContentTask;
  offeredTier: 1 | 2 | 3;
  disabled: boolean;
  reference?: ReactNode;
  externalPrimaryAction?: boolean;
  onPrimaryActionChange?: (state: TaskPrimaryActionState | null) => void;
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

export function TaskWorkspace({
  task,
  offeredTier,
  disabled,
  reference,
  externalPrimaryAction = false,
  onPrimaryActionChange,
  onSubmit,
}: Props) {
  const formId = useId();

  const handleSubmitReadyChange = useCallback(
    (ready: boolean) => {
      onPrimaryActionChange?.({ formId, ready });
    },
    [formId, onPrimaryActionChange]
  );

  const surfaceProps = {
    formId,
    hidePrimaryAction: externalPrimaryAction,
    onSubmitReadyChange: handleSubmitReadyChange,
    disabled,
    onSubmit,
  };

  const surface = task.family === "grid-draw"
    ? <GridDrawSurface {...surfaceProps} />
    : task.family === "sequence-world"
      ? <SequenceSurface {...surfaceProps} />
      : task.family === "rule-runner"
        ? <RuleSurface {...surfaceProps} maps={task.ruleMaps ?? []} />
        : task.family === "pattern-expand"
          ? <PatternSurface {...surfaceProps} expandCount={task.patternExpandCount} />
          : <ClaimSurface {...surfaceProps} claims={task.claims ?? []} />;

  return (
    <section
      data-testid={`task-workspace-${task.family}`}
      aria-labelledby="task-workspace-title"
      className="space-y-3 rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-3 sm:space-y-4 sm:p-6"
    >
      {/* Task-first: goal + controls before long copy so phones see the board above the fold. */}
      {reference}
      {/* «Что дано» is shown in the workspace, not stated in prose — the designer's
          point in 08-UX-MONSTER-JOURNEY §10.2, which we accepted: a child reads the
          materials where they use them, not in a labelled row above the fun. */}
      {task.givenRu?.length ? (
        <ul
          data-testid="task-given"
          aria-label="Что у тебя есть"
          className="flex flex-wrap gap-2"
        >
          {task.givenRu.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {surface}

      <header className="space-y-1.5 border-t border-[var(--border-color)] pt-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary-dark)]">
          Уровень {offeredTier}
          <span className="text-[var(--text-muted)]"> · </span>
          <span id="task-workspace-title" className="text-[var(--color-primary-dark)]">
            {FAMILY_TITLES[task.family]}
          </span>
        </p>
        {/* The goal lives inside the prompt line (§10.2) — one sentence naming the
            finished thing. promptRu remains the fallback until a session is backfilled. */}
        <p className="text-sm leading-6 text-[var(--text-primary)]" data-testid="task-prompt-caption">
          {task.goalRu ?? task.promptRu}
        </p>
        {offeredTier === 1 ? (
          <p className="rounded-xl bg-[var(--color-secondary-soft)] p-2.5 text-xs leading-5 text-[var(--color-secondary-dark)] sm:text-sm">
            <strong>Коротко:</strong> {TIER_ONE_REMINDERS[task.family]}
          </p>
        ) : null}
      </header>

      <WorkedExample family={task.family} initiallyOpen={false} />
    </section>
  );
}
