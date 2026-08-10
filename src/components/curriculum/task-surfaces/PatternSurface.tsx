"use client";

import { useEffect, useState } from "react";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { PRIMARY_ACTION_HIDDEN, type TaskPrimaryActionProps } from "./primary-action";

type Props = TaskPrimaryActionProps & {
  expandCount?: number;
  disabled: boolean;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
};

export function PatternSurface({
  formId,
  hidePrimaryAction,
  onSubmitReadyChange,
  expandCount = 5,
  disabled,
  onSubmit,
}: Props) {
  const [kind, setKind] = useState<"arithmetic" | "cycle">("arithmetic");
  const [start, setStart] = useState("");
  const [step, setStep] = useState("");
  const [cycle, setCycle] = useState("");
  const cycleItems = cycle.split(",").map((item) => item.trim()).filter(Boolean);
  const arithmeticReady = start.trim() !== "" && step.trim() !== "" && Number.isFinite(Number(start)) && Number.isFinite(Number(step));
  const complete = kind === "arithmetic" ? arithmeticReady : cycleItems.length > 0 && cycleItems.length < expandCount;

  useEffect(() => {
    onSubmitReadyChange?.(complete);
  }, [complete, onSubmitReadyChange]);

  return (
    <form
      id={formId}
      aria-label="Редактор короткого правила узора"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!complete) return;
        void onSubmit({
          status: "ok",
          rule: kind === "arithmetic"
            ? { kind, start: Number(start), step: Number(step) }
            : { kind, items: cycleItems },
        });
      }}
    >
      <fieldset disabled={disabled}>
        <legend className="mb-3 font-medium text-[var(--ink)]">Какое правило повторяется?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 px-3">
            <input type="radio" name="pattern-kind" value="arithmetic" checked={kind === "arithmetic"} onChange={() => setKind("arithmetic")} />
            Числа с одинаковым шагом
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 px-3">
            <input type="radio" name="pattern-kind" value="cycle" checked={kind === "cycle"} onChange={() => setKind("cycle")} />
            Короткий повторяющийся цикл
          </label>
        </div>
      </fieldset>
      {kind === "arithmetic" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 font-medium">Начальное число
            <input aria-label="Начальное число" inputMode="decimal" value={start} onChange={(event) => setStart(event.target.value)} disabled={disabled} className="min-h-11 rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]" />
          </label>
          <label className="grid gap-2 font-medium">Шаг
            <input aria-label="Шаг последовательности" inputMode="decimal" value={step} onChange={(event) => setStep(event.target.value)} disabled={disabled} className="min-h-11 rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]" />
          </label>
        </div>
      ) : (
        <label className="grid gap-2 font-medium">Элементы короткого цикла через запятую
          <input aria-label="Элементы короткого цикла" value={cycle} onChange={(event) => setCycle(event.target.value)} disabled={disabled} placeholder="красный, синий" className="min-h-11 rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 text-[var(--ink)] placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]" />
          <span className="text-sm font-normal text-[var(--text-muted)]">Монстр повторит правило {expandCount} раз. Не перечисляй готовый ответ целиком.</span>
        </label>
      )}
      <button
        type="submit"
        data-primary-action="true"
        disabled={disabled || !complete}
        className={`min-h-11 w-full rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-secondary-dark)] disabled:cursor-not-allowed disabled:opacity-50 ${hidePrimaryAction ? PRIMARY_ACTION_HIDDEN : ""}`}
      >
        Проверить
      </button>
    </form>
  );
}
