"use client";

import { useEffect, useState } from "react";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { PRIMARY_ACTION_HIDDEN, type TaskPrimaryActionProps } from "./primary-action";

type Props = TaskPrimaryActionProps & {
  disabled: boolean;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
};

const keyOf = (row: number, column: number) => `${row}:${column}`;

export function GridDrawSurface({
  formId,
  hidePrimaryAction,
  onSubmitReadyChange,
  disabled,
  onSubmit,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const ready = selected.size > 0;

  useEffect(() => {
    onSubmitReadyChange?.(ready);
  }, [onSubmitReadyChange, ready]);

  const toggle = (row: number, column: number) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = keyOf(row, column);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clear = () => setSelected(new Set());

  return (
    <form
      id={formId}
      aria-label="Поле для выбора клеток"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const cells = [...selected]
          .map((key) => key.split(":").map(Number) as [number, number])
          .sort(([rowA, columnA], [rowB, columnB]) => rowA - rowB || columnA - columnB);
        void onSubmit({ status: "ok", cells });
      }}
    >
      <fieldset disabled={disabled}>
        <legend className="mb-3 font-medium text-white">Выбери клетки на поле 4 на 4</legend>
        <div className="grid w-fit grid-cols-4 gap-2" role="group" aria-label="Клетки поля">
          {Array.from({ length: 16 }, (_, index) => {
            const row = Math.floor(index / 4);
            const column = index % 4;
            const active = selected.has(keyOf(row, column));
            return (
              <button
                key={index}
                type="button"
                aria-label={`Выбрать клетку ${row + 1}, ${column + 1}`}
                aria-pressed={active}
                onClick={() => toggle(row, column)}
                className={`h-12 w-12 rounded-xl border text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${active ? "border-violet-300 bg-violet-500 text-white" : "border-slate-600 bg-slate-800 text-slate-300"}`}
              >
                {row + 1},{column + 1}
              </button>
            );
          })}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={clear}
        disabled={disabled || selected.size === 0}
        className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:opacity-50"
      >
        Очистить поле
      </button>
      <button
        type="submit"
        data-primary-action="true"
        disabled={disabled || !ready}
        className={`min-h-11 w-full rounded-xl bg-violet-500 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50 ${hidePrimaryAction ? PRIMARY_ACTION_HIDDEN : ""}`}
      >
        Проверить
      </button>
    </form>
  );
}
