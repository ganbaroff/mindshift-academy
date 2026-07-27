/**
 * Week 1 task family: the child describes which cells of a grid to fill.
 * The monster fills exactly those cells. Precision is the whole lesson —
 * the executor has no notion of "what was probably meant".
 */

import type { Cell, GridProgram, UnclearReasonCode } from "./types";

export const GRID_SIZE = 4;

export type GridExecuteResult = {
  filled: ReadonlySet<string>;
  outOfBounds: Cell[];
};

export type GridVerdict = {
  pass: boolean;
  missing: Cell[];
  extra: Cell[];
  outOfBounds: Cell[];
};

const key = ([row, col]: Cell) => `${row},${col}`;
const parseKey = (k: string): Cell => {
  const [r, c] = k.split(",").map(Number);
  return [r, c];
};

function inBounds([row, col]: Cell): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < GRID_SIZE &&
    col >= 0 &&
    col < GRID_SIZE
  );
}

/** Pure. Same program always yields the same cells. Out-of-bounds are reported, never clamped. */
export function executeGrid(program: { cells: Cell[] }): GridExecuteResult {
  const filled = new Set<string>();
  const outOfBounds: Cell[] = [];
  for (const cell of program.cells) {
    if (!inBounds(cell)) {
      outOfBounds.push(cell);
      continue;
    }
    filled.add(key(cell));
  }
  return { filled, outOfBounds };
}

/** Pure, deterministic. No model involved. */
export function checkGrid(result: GridExecuteResult, target: Cell[]): GridVerdict {
  const targetKeys = new Set(target.map(key));
  const missing = [...targetKeys].filter((k) => !result.filled.has(k)).map(parseKey);
  const extra = [...result.filled].filter((k) => !targetKeys.has(k)).map(parseKey);
  return {
    pass: missing.length === 0 && extra.length === 0 && result.outOfBounds.length === 0,
    missing,
    extra,
    outOfBounds: result.outOfBounds,
  };
}

function renderGrid(cellKeys: ReadonlySet<string>, markKeys: ReadonlySet<string> = new Set()): string[] {
  const lines: string[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells: string[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const k = `${row},${col}`;
      const glyph = cellKeys.has(k) ? "\u25A0" : "\u00B7";
      cells.push(markKeys.has(k) ? `(${glyph})` : ` ${glyph} `);
    }
    lines.push(cells.join(""));
  }
  return lines;
}

export type RenderGridDiffOptions = {
  /**
   * Collision / first-blind tasks: do not print the target ASCII or missing-cell list
   * (that would defeat a hidden goal). UI reveals the picture after the attempt.
   */
  hideTargetPanel?: boolean;
};

/**
 * Teaching material in the monster's voice. VOLAURA UX law: no blame language
 * (docs/architecture/02-PRODUCT-AND-UX.md).
 */
export function renderGridDiff(
  result: GridExecuteResult,
  target: Cell[],
  verdict: GridVerdict,
  opts: RenderGridDiffOptions = {}
): string {
  const targetKeys = new Set(target.map(key));
  const disagreement = new Set([...verdict.missing, ...verdict.extra].map(key));
  const mine = renderGrid(result.filled, disagreement);

  if (opts.hideTargetPanel) {
    const lines = ["  Я закрасил так:"];
    for (let i = 0; i < GRID_SIZE; i++) {
      lines.push(`  ${mine[i]}`);
    }
    lines.push("");
    if (verdict.pass) {
      lines.push("  Совпало клетка в клетку. Ты сказал ровно то, что хотел.");
    } else {
      lines.push(
        "  Не совпало с целью. Посмотри картинку рядом — там видно, что просили. Скажи ещё раз своими словами."
      );
      if (verdict.extra.length) {
        lines.push(
          `  Лишнее (я понял так): ${verdict.extra.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`
        );
      }
      if (verdict.outOfBounds.length) {
        lines.push(
          `  За полем: ${verdict.outOfBounds.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`
        );
      }
    }
    return lines.join("\n");
  }

  const asked = renderGrid(targetKeys, disagreement);

  const lines = ["  Я закрасил так:        А просили так:"];
  for (let i = 0; i < GRID_SIZE; i++) {
    lines.push(`  ${mine[i]}     ${asked[i]}`);
  }

  if (verdict.pass) {
    lines.push("");
    lines.push("  Совпало клетка в клетку. Ты сказал ровно то, что хотел.");
    return lines.join("\n");
  }

  lines.push("");
  if (verdict.missing.length) {
    lines.push(
      `  Про эти клетки я ничего не услышал: ${verdict.missing.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`
    );
  }
  if (verdict.extra.length) {
    lines.push(
      `  А эти я закрасил, потому что понял тебя так: ${verdict.extra.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`
    );
  }
  if (verdict.outOfBounds.length) {
    lines.push(
      `  Здесь я вышел за поле — таких клеток нет: ${verdict.outOfBounds.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`
    );
  }
  return lines.join("\n");
}

/** World description for the interpreter. Contains no hint of the target. */
export const GRID_WORLD_PROMPT = `Поле — сетка ${GRID_SIZE} на ${GRID_SIZE} клеток.
Строки нумеруются сверху вниз: 1 — самая верхняя, ${GRID_SIZE} — самая нижняя.
Столбцы нумеруются слева направо: 1 — самый левый, ${GRID_SIZE} — самый правый.
Единственное доступное действие — закрасить клетку.`;

const REASON_CODES: ReadonlySet<string> = new Set([
  "no_actions",
  "ambiguous_cells",
  "ambiguous_steps",
  "out_of_vocabulary",
  "not_an_instruction",
  "do_nothing",
]);

/** Converts 1-based model cells to 0-based executor coordinates. */
export function normalizeGridProgram(raw: {
  status: string;
  cells?: unknown;
  reasonCode?: string;
}): GridProgram {
  if (raw.status !== "ok") {
    const code = REASON_CODES.has(raw.reasonCode ?? "")
      ? (raw.reasonCode as UnclearReasonCode)
      : "ambiguous_cells";
    return { status: "unclear", reasonCode: code };
  }
  const cells = (Array.isArray(raw.cells) ? raw.cells : []).map((pair) => {
    const [row, col] = pair as [number, number];
    return [Number(row) - 1, Number(col) - 1] as Cell;
  });
  return { status: "ok", cells };
}
