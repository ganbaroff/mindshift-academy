// The deterministic half of the spike: no key, no network, no model. It answers two questions
// the model cannot help with. Are the executors reproducible, and is the feedback a child could
// actually learn from? Run this before trusting anything in run-interpreter.mjs.

import * as grid from "./lib/grid-draw.mjs";
import * as seq from "./lib/sequence-world.mjs";
import { makeTarget, referabilityCost, isSolvable, rng, uniqueShapeCount } from "./lib/targets.mjs";

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const to0 = (cells) => cells.map(([r, c]) => [r - 1, c - 1]);

console.log("\n=== 1. Executors are deterministic ===");
{
  const program = { status: "ok", cells: to0([[1, 1], [1, 2], [2, 1]]) };
  const runs = new Set();
  for (let i = 0; i < 200; i++) {
    const result = grid.execute(program);
    runs.add(JSON.stringify([...result.filled].sort()));
  }
  check("grid-draw: 200 runs yield one result", runs.size === 1, `${runs.size} distinct`);

  const seqProgram = { status: "ok", steps: ["взять_нож", "положить_хлеб", "намазать_масло"] };
  const seqRuns = new Set();
  for (let i = 0; i < 200; i++) seqRuns.add(JSON.stringify(seq.execute(seqProgram)));
  check("sequence-world: 200 runs yield one result", seqRuns.size === 1, `${seqRuns.size} distinct`);
}

console.log("\n=== 2. The checker is strict in both directions ===");
{
  const target = to0([[1, 1], [1, 2], [2, 1], [2, 2]]);

  const exact = grid.check(grid.execute({ cells: target }), target);
  check("exact match passes", exact.pass);

  const short = grid.check(grid.execute({ cells: to0([[1, 1], [1, 2], [2, 1]]) }), target);
  check("missing cell fails and is named", !short.pass && short.missing.length === 1);

  const over = grid.check(grid.execute({ cells: [...target, ...to0([[4, 4]])] }), target);
  check("extra cell fails and is named", !over.pass && over.extra.length === 1);

  const outside = grid.check(grid.execute({ cells: to0([[5, 2]]) }), target);
  check("out-of-bounds is reported, never clamped", outside.outOfBounds.length === 1 && !outside.pass);
}

console.log("\n=== 3. What the child actually sees ===");
{
  const target = to0([[1, 1], [1, 2], [2, 1], [2, 2]]);
  const result = grid.execute({ cells: to0([[1, 1], [1, 2], [2, 1]]) });
  console.log("\n--- Week 1: three of four cells named ---");
  console.log(grid.renderDiff(result, target, grid.check(result, target)));

  const ok = grid.execute({ cells: target });
  console.log("\n--- Week 1: exact ---");
  console.log(grid.renderDiff(ok, target, grid.check(ok, target)));

  console.log("\n--- Week 2: impossible order kept as given ---");
  const wrongOrder = seq.execute({ steps: ["намазать_масло", "взять_нож", "положить_хлеб"] });
  console.log(seq.renderDiff(wrongOrder, seq.check(wrongOrder)));

  console.log("\n--- Week 2: knife never picked up ---");
  const noKnife = seq.execute({ steps: ["положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"] });
  console.log(seq.renderDiff(noKnife, seq.check(noKnife)));

  console.log("\n--- Week 2: steps run out before the sandwich exists ---");
  const unfinished = seq.execute({ steps: ["взять_нож", "положить_хлеб", "намазать_масло"] });
  console.log(seq.renderDiff(unfinished, seq.check(unfinished)));

  console.log("\n--- Week 2: correct ---");
  const done = seq.execute({ steps: ["взять_нож", "положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"] });
  console.log(seq.renderDiff(done, seq.check(done)));
}

console.log("\n=== 4. Feedback quality is mechanical, not hand-written ===");
{
  const target = to0([[1, 1], [1, 2], [2, 1], [2, 2]]);
  const result = grid.execute({ cells: to0([[1, 1], [1, 2], [2, 1]]) });
  const text = grid.renderDiff(result, target, grid.check(result, target));
  // VOLAURA UX law, docs/architecture/02-PRODUCT-AND-UX.md:10-12.
  const banned = ["неправильно", "ошибка", "неверно", "провал", "failed"];
  check("no blame language in the diff", !banned.some((w) => text.toLowerCase().includes(w)));
  check("the diff names specific cells", /\(\d,\d\)/.test(text));
  check("the diff shows both grids", text.includes("Я закрасил так") && text.includes("А просили так"));

  const seqText = seq.renderDiff(
    seq.execute({ steps: ["намазать_масло"] }),
    seq.check(seq.execute({ steps: ["намазать_масло"] }))
  );
  check("sequence diff names the step and the reason", seqText.includes("шаге 1") && seqText.includes("нет ножа"));
}

console.log("\n=== 5. Targets are reproducible, solvable, and not collapsed ===");
{
  // Cost rising by tier is a sanity filter, NOT proof the behavioural ladder is real.
  // That proof lives only in run-child-loop.mjs with UNIQUE targets. A prior version of this
  // section passed while every tier-3 shape was the same middle square.
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
  let unsolvable = 0;
  let unstable = 0;
  const tiers = [1, 2, 3, 4];
  const cost = Object.fromEntries(tiers.map((t) => [t, []]));
  for (const tier of tiers) {
    for (const seed of seeds) {
      const a = makeTarget(tier, seed);
      if (JSON.stringify(a) !== JSON.stringify(makeTarget(tier, seed))) unstable += 1;
      if (!isSolvable(a)) unsolvable += 1;
      cost[tier].push(referabilityCost(a));
    }
  }
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  check("same seed always gives the same target", unstable === 0, `${unstable} unstable`);
  check("every generated target is solvable", unsolvable === 0, `${unsolvable} unsolvable`);
  const means = tiers.map((t) => mean(cost[t]));
  console.log(`        mean cost of saying it (sanity only): ${tiers.map((t, i) => `tier${t} ${means[i].toFixed(2)}`).join("  ")}`);
  check("tier-1 cost stays cheap (whole row/col)", means[0] <= 1.5, `mean ${means[0].toFixed(2)}`);
  check("tier-3 cost is dearer than tier-1", means[2] > means[0], `${means[2].toFixed(2)} vs ${means[0].toFixed(2)}`);
  // The collapse that killed the previous ladder: too few distinct shapes.
  const unique3 = uniqueShapeCount(3, 200);
  const unique2 = uniqueShapeCount(2, 200);
  console.log(`        unique shapes in 200 seeds: tier2 ${unique2}  tier3 ${unique3}`);
  check("tier-3 generator is not collapsed", unique3 >= 40, `only ${unique3} unique shapes`);
  // Tier 2 on a 4×4 has a small combinatorial space (edge runs × rows). Require diversity,
  // not abundance — the collapse we care about is "one shape forever", not "fewer than 20".
  check("tier-2 generator is not collapsed", unique2 >= 12, `only ${unique2} unique shapes`);
  // Guard against the elShape bug that once emitted a single cell after clamping.
  let tiny = 0;
  for (let seed = 1; seed <= 200; seed++) {
    if (makeTarget(3, seed).length < 2) tiny += 1;
  }
  check("tier-3 never emits fewer than 2 cells", tiny === 0, `${tiny} tiny targets`);
  check("prng is not degenerate", new Set(Array.from({ length: 50 }, (_, i) => rng(i + 1)())).size === 50);
}

console.log(`\n${failures === 0 ? "OFFLINE SPIKE: all checks passed" : `OFFLINE SPIKE: ${failures} FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
