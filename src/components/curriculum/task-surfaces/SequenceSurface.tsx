"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { displayOrder, publicSequenceWorld } from "@/lib/tasks/sequence-worlds-public";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { PRIMARY_ACTION_HIDDEN, type TaskPrimaryActionProps } from "./primary-action";

type Props = TaskPrimaryActionProps & {
  disabled: boolean;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
  /** Which micro-world this task runs in. Falls back to the sandwich. */
  worldId?: string | null;
};

export function SequenceSurface({
  formId,
  hidePrimaryAction,
  onSubmitReadyChange,
  disabled,
  onSubmit,
  worldId,
}: Props) {
  // The public half of the world: scene, vocabulary and labels. The requirements live on
  // the server — they are the answer key, and this file used to import them, which shipped
  // the whole state machine to the browser.
  const world = publicSequenceWorld(worldId);
  const labels = world.labelsRu;
  const buttons = displayOrder(world);
  const [steps, setSteps] = useState<string[]>([]);
  const ready = steps.length > 0;
  // Every world's rules guard each action with a max-count requirement, so a
  // duplicate action always breaks a later step in the chain before the goal
  // is reached — no world in src/lib/tasks/sequence-world.ts has a valid
  // sequence that repeats the same action. Once added, a source chip is
  // retired until its step is removed, instead of inviting a repeat tap that
  // can only ever produce a failing attempt.
  const usedActions = new Set(steps);

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
        {/* The scene, or a child meeting a new world has to guess what is on the table. */}
        <p className="mb-3 text-sm text-[var(--text-secondary)]">{world.sceneRu}</p>
        <div className="flex flex-wrap gap-2">
          {buttons.map((action) => {
            const isUsed = usedActions.has(action);
            return (
              <button
                key={action}
                type="button"
                aria-label={
                  isUsed
                    ? `Действие уже добавлено: ${labels[action]}`
                    : `Добавить действие: ${labels[action]}`
                }
                aria-pressed={isUsed}
                disabled={disabled || isUsed}
                onClick={() => setSteps((current) => [...current, action])}
                className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:cursor-not-allowed ${
                  isUsed
                    ? "border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-muted)] opacity-60"
                    : "border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--ink)]"
                }`}
              >
                {isUsed ? `✓ добавлено · ${labels[action]}` : `+ ${labels[action]}`}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div aria-label="Выбранный порядок действий" className="rounded-xl bg-[var(--surface)]/70 p-3">
        {steps.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Пока нет шагов.</p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li key={`${step}-${index}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg bg-[var(--surface-strong)] px-3">
                <span>{index + 1}. {labels[step] ?? step}</span>
                {/* Was a pale text link with no border/background — easy to miss and
                    under the touch minimum in practice. Now a real button: bordered,
                    ≥44px, with an icon so "remove" reads as a control, not a caption. */}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Убрать шаг ${index + 1}: ${labels[step] ?? step}`}
                  onClick={() => setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-primary-dark)]/30 bg-[var(--surface-strong)] px-3 text-sm font-semibold text-[var(--color-primary-dark)] transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
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
