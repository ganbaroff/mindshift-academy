"use client";

import { GRID_SIZE } from "@/lib/tasks/grid-draw";
import type { Cell } from "@/lib/tasks/types";

type Props = {
  /** 0-based filled cells from the monster's last attempt. */
  filled?: Cell[];
  /** 0-based target cells — highlighted when pass is false. */
  target?: Cell[];
  /** Cells where monster and target disagree. */
  mismatch?: Cell[];
  label?: string;
};

const key = ([r, c]: Cell) => `${r},${c}`;

/** Keep the spoken state deterministic and concise even if callers repeat a cell. */
function describeCells(cells: Cell[]) {
  const unique = Array.from(
    new Map(cells.map((cell) => [key(cell), cell])).values(),
  ).sort(([rowA, colA], [rowB, colB]) => rowA - rowB || colA - colB);

  if (unique.length === 0) return "нет";
  return unique
    .map(([row, col]) => `строка ${row + 1}, столбец ${col + 1}`)
    .join("; ");
}

function buildAccessibleSummary(
  filled: Cell[],
  target: Cell[],
  mismatch: Cell[],
  label?: string,
) {
  const prefix = label ? `${label}. ` : "";
  return `${prefix}Закрашены клетки: ${describeCells(filled)}. Целевые клетки: ${describeCells(target)}. Несовпадения: ${describeCells(mismatch)}.`;
}

export function DisplayGrid({ filled = [], target = [], mismatch = [], label }: Props) {
  const filledSet = new Set(filled.map(key));
  const targetSet = new Set(target.map(key));
  const mismatchSet = new Set(mismatch.map(key));
  const accessibleSummary = buildAccessibleSummary(filled, target, mismatch, label);

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-dark)]/80">{label}</p>
      ) : null}
      <div
        className="inline-grid gap-1 p-3 rounded-2xl bg-[var(--surface-strong)] border border-[var(--border-color)] w-fit"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
        role="img"
        aria-label={accessibleSummary}
      >
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
          const row = Math.floor(i / GRID_SIZE);
          const col = i % GRID_SIZE;
          const k = `${row},${col}`;
          const isFilled = filledSet.has(k);
          const isTarget = targetSet.has(k);
          const isMismatch = mismatchSet.has(k);

          let cellClass =
            "w-11 h-11 sm:w-12 sm:h-12 rounded-lg border transition-colors duration-300 ";
          if (isMismatch) {
            cellClass += "border-[var(--color-accent-dark)] bg-[var(--color-accent)]";
          } else if (isFilled) {
            cellClass += "border-violet-400/60 bg-[var(--color-primary)]/40";
          } else if (isTarget) {
            cellClass += "border-cyan-400/40 bg-cyan-500/10";
          } else {
            cellClass += "border-[var(--border-color)] bg-white/[0.03]";
          }

          return <div key={k} className={cellClass} aria-hidden="true" tabIndex={-1} />;
        })}
      </div>
    </div>
  );
}
