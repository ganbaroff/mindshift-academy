"use client";

import { useEffect, useState } from "react";
import { SEQUENCE_ACTIONS } from "@/lib/tasks/sequence-world";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { PRIMARY_ACTION_HIDDEN, type TaskPrimaryActionProps } from "./primary-action";

type Props = TaskPrimaryActionProps & {
  disabled: boolean;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
};

const ACTION_LABELS: Record<(typeof SEQUENCE_ACTIONS)[number], string> = {
  взять_нож: "Взять нож",
  положить_хлеб: "Положить хлеб",
  намазать_масло: "Намазать масло",
  положить_сыр: "Положить сыр",
  накрыть_хлебом: "Накрыть хлебом",
  подать: "Подать",
};

export function SequenceSurface({
  formId,
  hidePrimaryAction,
  onSubmitReadyChange,
  disabled,
  onSubmit,
}: Props) {
  const [steps, setSteps] = useState<string[]>([]);
  const ready = steps.length > 0;

  useEffect(() => {
    onSubmitReadyChange?.(ready);
  }, [onSubmitReadyChange, ready]);

  return (
    <form
      id={formId}
      aria-label="Редактор порядка действий"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ status: "ok", steps });
      }}
    >
      <fieldset disabled={disabled}>
        <legend className="mb-3 font-medium text-[var(--ink)]">Добавь действия в нужном порядке</legend>
        <div className="flex flex-wrap gap-2">
          {SEQUENCE_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              aria-label={`Добавить действие: ${ACTION_LABELS[action]}`}
              onClick={() => setSteps((current) => [...current, action])}
              className="min-h-11 rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
            >
              + {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </fieldset>
      <div aria-label="Выбранный порядок действий" className="rounded-xl bg-[var(--surface)]/70 p-3">
        {steps.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Пока нет шагов.</p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={`${step}-${index}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--surface-strong)] px-3">
                <span>{index + 1}. {ACTION_LABELS[step as keyof typeof ACTION_LABELS]}</span>
                <button
                  type="button"
                  aria-label={`Убрать шаг ${index + 1}`}
                  onClick={() => setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="min-h-11 px-3 font-semibold text-rose-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
                >
                  Убрать
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <button
        type="button"
        onClick={() => setSteps([])}
        disabled={disabled || steps.length === 0}
        className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:opacity-50"
      >
        Начать порядок заново
      </button>
      <button
        type="submit"
        data-primary-action="true"
        disabled={disabled || !ready}
        className={`min-h-11 w-full rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-secondary-dark)] disabled:cursor-not-allowed disabled:opacity-50 ${hidePrimaryAction ? PRIMARY_ACTION_HIDDEN : ""}`}
      >
        Проверить
      </button>
    </form>
  );
}
