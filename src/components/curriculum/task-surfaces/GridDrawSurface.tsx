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
        <legend className="mb-2 text-sm font-medium text-[var(--ink)]">Выбери клетки на поле 4×4</legend>
        <div className="grid w-fit grid-cols-4 gap-1.5 sm:gap-2" role="group" aria-label="Клетки поля">
          {Array.from({ length: 16 }, (_, index) => {
            const row = Math.floor(index / 4);
            const column = index % 4;
            const active = selected.has(keyOf(row, column));
            return (
              <button
                key={index}
                type="button"
                // Coordinates live only in the accessible name now — the visible cell
                // face carries no text, so it reads as the same picture-language as
                // the target grid above it (DisplayGrid), not a coordinate to translate.
                aria-label={`Ряд ${row + 1}, колонка ${column + 1}`}
                aria-pressed={active}
                onClick={() => toggle(row, column)}
                // The cell a child actually taps, several times per attempt: it had no
                // feedback at all, so a tap either landed or it did not and only the colour
                // said so, with no press. 120ms colour + a 0.94 press. plans/002.
                // 44px on a phone, measured at 320px — was 40. Sixteen of these are the
                // most-tapped controls in the product and every one of them was under the
                // touch minimum. The room was always there: 320px leaves 264px inside the
                // page and workspace padding, and four 44px cells with 6px gaps need 194px.
                // Size/shape/rounding and the active fill colour match DisplayGrid's target
                // cells exactly (same cyan) so a filled input cell looks like the target
                // picture it is meant to reproduce, instead of a differently-styled control.
                className={`h-11 w-11 rounded-lg border transition-[color,background-color,border-color,scale] duration-[120ms] [transition-timing-function:var(--ease-out)] active:scale-[0.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] sm:h-12 sm:w-12 ${active ? "border-cyan-400/40 bg-cyan-500/10" : "border-[var(--border-color)] bg-[var(--surface-strong)]"}`}
              />
            );
          })}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={clear}
        disabled={disabled || selected.size === 0}
        className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--text-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:opacity-50"
      >
        Очистить поле
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
