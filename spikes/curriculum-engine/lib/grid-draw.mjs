// Week 1 task family: the child describes which cells of a grid to fill. The monster fills
// exactly those cells and nothing else. Precision is the whole lesson, so the executor is
// deliberately unforgiving: it has no notion of "what was probably meant".

export const GRID_SIZE = 4;

const key = ([row, col]) => `${row},${col}`;
const parseKey = (k) => k.split(",").map(Number);

function inBounds([row, col]) {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

/**
 * Runs an interpreted program. Pure: same program always yields the same cells.
 * Out-of-bounds cells are reported rather than clamped — clamping would silently
 * rescue an imprecise instruction, which is exactly the feedback we must not hide.
 */
export function execute(program) {
  const filled = new Set();
  const outOfBounds = [];
  for (const cell of program.cells ?? []) {
    if (!inBounds(cell)) {
      outOfBounds.push(cell);
      continue;
    }
    filled.add(key(cell));
  }
  return { filled, outOfBounds };
}

/** Compares executed output against the target. Pure, deterministic, no model involved. */
export function check(result, target) {
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

function renderGrid(cellKeys, markKeys = new Set()) {
  const lines = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const k = `${row},${col}`;
      const glyph = cellKeys.has(k) ? "\u25A0" : "\u00B7";
      cells.push(markKeys.has(k) ? `(${glyph})` : ` ${glyph} `);
    }
    lines.push(cells.join(""));
  }
  return lines;
}

/**
 * The diff is the teaching material, so it is written in the monster's voice and never
 * blames the child. VOLAURA UX law (docs/architecture/02-PRODUCT-AND-UX.md:10-12): no
 * "неправильно", no failure language. The monster reports what it did, not what the child
 * got wrong.
 */
export function renderDiff(result, target, verdict) {
  const targetKeys = new Set(target.map(key));
  const disagreement = new Set([...verdict.missing, ...verdict.extra].map(key));

  const mine = renderGrid(result.filled, disagreement);
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
    lines.push(`  Про эти клетки я ничего не услышал: ${verdict.missing.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`);
  }
  if (verdict.extra.length) {
    lines.push(`  А эти я закрасил, потому что понял тебя так: ${verdict.extra.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`);
  }
  if (verdict.outOfBounds.length) {
    lines.push(`  Здесь я вышел за поле — таких клеток нет: ${verdict.outOfBounds.map((c) => `(${c[0] + 1},${c[1] + 1})`).join(" ")}`);
  }
  return lines.join("\n");
}

/** World description handed to the interpreter. Contains no hint of the target. */
export const WORLD_PROMPT = `Поле — сетка ${GRID_SIZE} на ${GRID_SIZE} клеток.
Строки нумеруются сверху вниз: 1 — самая верхняя, ${GRID_SIZE} — самая нижняя.
Столбцы нумеруются слева направо: 1 — самый левый, ${GRID_SIZE} — самый правый.
Единственное доступное действие — закрасить клетку.`;

export const OUTPUT_SCHEMA = `{"status":"ok","cells":[[строка,столбец], ...]}
или {"status":"underspecified","reason":"чего именно не хватает"}
или {"status":"irrelevant","reason":"почему это не инструкция для поля"}
Строки и столбцы нумеруй с 1.`;

/** Converts 1-based model output to the 0-based coordinates the executor uses. */
export function normalizeProgram(raw) {
  if (raw?.status !== "ok") return raw;
  return { ...raw, cells: (raw.cells ?? []).map(([row, col]) => [Number(row) - 1, Number(col) - 1]) };
}
