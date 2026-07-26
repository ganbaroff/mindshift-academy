// Seeded target generation for the grid family.
//
// Two earlier versions of this file claimed a difficulty ladder and both lied. The first counted
// contiguous runs; the second counted "referability cost" while generating tier-3 shapes that
// on a 4×4 grid all collapsed into the same middle digram — `interiorRun` had only one legal
// start column. Offline checks agreed; the closed loop then showed tier 3 easier than tier 2
// because every target was nameable as "посередине".
//
// Rules that survive those two failures:
//   1. A tier that claims to need an offset must not admit a single cheap relational word.
//      Tier 3 is therefore scattered cells / L-shapes, never a centred digram.
//   2. Offline cost checks are a sanity filter only. The ladder is real only when
//      run-child-loop.mjs shows mean attempts rising across UNIQUE targets.
//   3. The offline suite refuses a collapsed generator (too few unique shapes per tier).

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
const keyOf = ([r, c]) => `${r},${c}`;
const dedupe = (cells) => [...new Set(cells.map(keyOf))].map((k) => k.split(",").map(Number));

const wholeRow = (row) => Array.from({ length: GRID_SIZE }, (_, col) => [row, col]);
const wholeColumn = (col) => Array.from({ length: GRID_SIZE }, (_, row) => [row, col]);

/** A run anchored to the left or right edge: nameable as "the first N" or "the last N". */
function edgeRun(rand, row) {
  const length = 2 + pick(rand, GRID_SIZE - 2);
  return pick(rand, 2) === 0
    ? Array.from({ length }, (_, i) => [row, i])
    : Array.from({ length }, (_, i) => [row, GRID_SIZE - 1 - i]);
}

/**
 * Two cells that share no cheap relational word. Rejected: same cell, adjacency ("рядом"),
 * same-row/col short runs ("две посередине"), and the centred 2×2 that killed the last ladder.
 */
function offsetPair(rand) {
  for (let tries = 0; tries < 80; tries++) {
    const a = [pick(rand, GRID_SIZE), pick(rand, GRID_SIZE)];
    const b = [pick(rand, GRID_SIZE), pick(rand, GRID_SIZE)];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const manhattan = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    if (manhattan <= 1) continue; // adjacent or same
    if (a[0] === b[0] && Math.abs(a[1] - b[1]) <= 2) continue; // short horizontal run
    if (a[1] === b[1] && Math.abs(a[0] - b[0]) <= 2) continue; // short vertical run
    // Reject pairs that sit in the centre 2×2 of a 4×4 — those read as "посередине".
    const centre = new Set(["1,1", "1,2", "2,1", "2,2"]);
    if (GRID_SIZE === 4 && centre.has(keyOf(a)) && centre.has(keyOf(b))) continue;
    return [a, b];
  }
  // Deterministic fallback: knight-move corners, never "посередине".
  return [
    [0, 1],
    [2, GRID_SIZE - 1],
  ];
}

/** An L of three cells. Forces naming two directions; not a square and not a single run. */
function elShape(rand) {
  // Anchor in the top-left of a 2×2 window so the three arms always stay in bounds.
  const row = pick(rand, GRID_SIZE - 1);
  const col = pick(rand, GRID_SIZE - 1);
  const variants = [
    [
      [row, col],
      [row, col + 1],
      [row + 1, col],
    ],
    [
      [row, col + 1],
      [row, col],
      [row + 1, col + 1],
    ],
    [
      [row + 1, col],
      [row + 1, col + 1],
      [row, col],
    ],
    [
      [row + 1, col + 1],
      [row + 1, col],
      [row, col + 1],
    ],
  ];
  const cells = variants[pick(rand, variants.length)];
  if (dedupe(cells).length !== 3) {
    throw new Error(`elShape collapsed: ${JSON.stringify(cells)}`);
  }
  return cells;
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
    return pick(rand, 2) === 0 ? offsetPair(rand) : elShape(rand);
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
  if (!cols.length) return [];
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
 * How expensive the shape is to say out loud. Sanity filter only — see file header.
 * Offline must never treat a rising cost as proof that the behavioural ladder is real.
 */
export function referabilityCost(target) {
  const byRow = rowsOf(target);

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
      else cost += 4;
    }
  }
  // Scattered cells (one cell per row) pay the offset premium once each via the else branch.
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

/** Distinct shapes among N seeds — used to refuse a collapsed generator. */
export function uniqueShapeCount(tier, seedCount) {
  const shapes = new Set();
  for (let seed = 1; seed <= seedCount; seed++) shapes.add(JSON.stringify(makeTarget(tier, seed)));
  return shapes.size;
}
