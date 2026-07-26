// Seeded target generation for the grid family.
//
// The first version of this file counted how many contiguous runs a target contained and called
// that difficulty. The offline test agreed and passed. The synthetic-child loop then showed the
// opposite: tier 2 was *easier* than tier 1 (1.25 attempts against 1.75), because a target made
// of two whole rows is one short sentence — "закрась второй и третий ряды" — while a two-cell
// fragment floating inside a row forces the child to pin down exactly which cells.
//
// So difficulty is not about how many pieces a shape has. It is about how hard the shape is to
// REFER TO. That is what `referabilityCost` measures, and the tiers below are built from it:
//   whole row or column      cheap  — one noun
//   run touching an edge     medium — a noun plus a count
//   run floating inside      dear   — every cell has to be located
// The ladder is then confirmed behaviourally in run-child-loop.mjs, not by trusting this file.

import { GRID_SIZE } from "./grid-draw.mjs";

/** mulberry32: tiny, seeded, reproducible. A fixed seed must always yield the same target. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, n) => Math.floor(rand() * n);
const dedupe = (cells) => [...new Set(cells.map((c) => c.join(",")))].map((k) => k.split(",").map(Number));

const wholeRow = (row) => Array.from({ length: GRID_SIZE }, (_, col) => [row, col]);
const wholeColumn = (col) => Array.from({ length: GRID_SIZE }, (_, row) => [row, col]);

/** A run anchored to the left or right edge: nameable as "the first N" or "the last N". */
function edgeRun(rand, row) {
  const length = 2 + pick(rand, GRID_SIZE - 2);
  return pick(rand, 2) === 0
    ? Array.from({ length }, (_, i) => [row, i])
    : Array.from({ length }, (_, i) => [row, GRID_SIZE - 1 - i]);
}

/** A run touching neither edge: the child has to locate its ends. */
function interiorRun(rand, row) {
  const length = 2;
  const start = 1 + pick(rand, GRID_SIZE - length - 1);
  return Array.from({ length }, (_, i) => [row, start + i]);
}

export function makeTarget(tier, seed) {
  const rand = rng(seed);
  if (tier === 1) {
    const index = pick(rand, GRID_SIZE);
    return pick(rand, 2) === 0 ? wholeRow(index) : wholeColumn(index);
  }
  if (tier === 2) {
    const row = pick(rand, GRID_SIZE);
    return edgeRun(rand, row);
  }
  if (tier === 3) {
    const rowA = pick(rand, GRID_SIZE);
    let rowB = pick(rand, GRID_SIZE);
    if (rowB === rowA) rowB = (rowA + 1) % GRID_SIZE;
    return dedupe([...interiorRun(rand, rowA), ...interiorRun(rand, rowB)]);
  }
  // Tier 4 is rule-shaped: a checker pattern cannot be described by pointing at pieces at all,
  // only by stating a rule. That is the Week 4 skill and it does not belong in Week 1.
  const parity = pick(rand, 2);
  const cells = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if ((row + col) % 2 === parity) cells.push([row, col]);
    }
  }
  return cells;
}

const rowsOf = (target) => {
  const byRow = new Map();
  for (const [row, col] of target) {
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push(col);
  }
  for (const cols of byRow.values()) cols.sort((a, b) => a - b);
  return byRow;
};

const runsIn = (cols) => {
  const runs = [];
  let current = [cols[0]];
  for (let i = 1; i < cols.length; i++) {
    if (cols[i] === cols[i - 1] + 1) current.push(cols[i]);
    else {
      runs.push(current);
      current = [cols[i]];
    }
  }
  runs.push(current);
  return runs;
};

/**
 * How expensive the shape is to say out loud. Whole rows and columns are cheap because they
 * have names; interior fragments are dear because every end has to be located.
 */
export function referabilityCost(target) {
  const byRow = rowsOf(target);

  // A set of whole columns reads as one phrase, so price it as columns rather than as a
  // fragment in every row.
  const columnCounts = new Map();
  for (const [, col] of target) columnCounts.set(col, (columnCounts.get(col) ?? 0) + 1);
  const fullColumns = [...columnCounts.entries()].filter(([, n]) => n === GRID_SIZE);
  if (fullColumns.length && fullColumns.length * GRID_SIZE === target.length) return fullColumns.length;

  let cost = 0;
  for (const cols of byRow.values()) {
    for (const run of runsIn(cols)) {
      const touchesLeft = run[0] === 0;
      const touchesRight = run[run.length - 1] === GRID_SIZE - 1;
      if (run.length === GRID_SIZE) cost += 1;
      else if (touchesLeft || touchesRight) cost += 2;
      else cost += 3;
    }
  }
  return cost;
}

/** A target no child could ever hit, or one that is already empty, is a broken target. */
export function isSolvable(target) {
  return (
    target.length > 0 &&
    target.length < GRID_SIZE * GRID_SIZE &&
    target.every(([r, c]) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE)
  );
}
