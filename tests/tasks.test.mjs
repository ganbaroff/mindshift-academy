#!/usr/bin/env node
/**
 * Deterministic gate for the executable-task engine (thinking curriculum Phase 1).
 * No network, no LLM, no database. Ported from spikes/curriculum-engine/run-offline.mjs.
 */
import {
  GRID_SIZE,
  checkGrid,
  checkSequence,
  executeGrid,
  executeSequence,
  renderGridDiff,
  renderSequenceDiff,
} from "../src/lib/tasks/index.ts";

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const to0 = (cells) => cells.map(([r, c]) => [r - 1, c - 1]);

console.log("\n=== 1. Executors are deterministic ===");
{
  const program = { cells: to0([[1, 1], [1, 2], [2, 1]]) };
  const runs = new Set();
  for (let i = 0; i < 200; i++) {
    const result = executeGrid(program);
    runs.add(JSON.stringify([...result.filled].sort()));
  }
  check("grid-draw: 200 runs yield one result", runs.size === 1, `${runs.size} distinct`);

  const seqProgram = { steps: ["взять_нож", "положить_хлеб", "намазать_масло"] };
  const seqRuns = new Set();
  for (let i = 0; i < 200; i++) seqRuns.add(JSON.stringify(executeSequence(seqProgram)));
  check("sequence-world: 200 runs yield one result", seqRuns.size === 1, `${seqRuns.size} distinct`);
}

console.log("\n=== 2. Checker is strict in both directions ===");
{
  const target = to0([[1, 1], [1, 2], [2, 1], [2, 2]]);
  check("exact match passes", checkGrid(executeGrid({ cells: target }), target).pass);

  const short = checkGrid(executeGrid({ cells: to0([[1, 1], [1, 2], [2, 1]]) }), target);
  check("missing cell fails and is named", !short.pass && short.missing.length === 1);

  const over = checkGrid(executeGrid({ cells: [...target, ...to0([[4, 4]])] }), target);
  check("extra cell fails and is named", !over.pass && over.extra.length === 1);

  const outside = checkGrid(executeGrid({ cells: to0([[5, 2]]) }), target);
  check("out-of-bounds reported, never clamped", outside.outOfBounds.length === 1 && !outside.pass);
}

console.log("\n=== 3. Diff quality (shame-free) ===");
{
  const target = to0([[1, 1], [1, 2], [2, 1], [2, 2]]);
  const result = executeGrid({ cells: to0([[1, 1], [1, 2], [2, 1]]) });
  const text = renderGridDiff(result, target, checkGrid(result, target));
  const banned = ["неправильно", "ошибка", "неверно", "провал", "failed"];
  check("no blame language in grid diff", !banned.some((w) => text.toLowerCase().includes(w)));
  check("diff names specific cells", /\(\d,\d\)/.test(text));
  check("diff shows both grids", text.includes("Я закрасил так") && text.includes("А просили так"));

  const stuck = executeSequence({ steps: ["намазать_масло"] });
  const seqText = renderSequenceDiff(stuck, checkSequence(stuck));
  check("sequence diff names step and reason", seqText.includes("шаге 1") && seqText.includes("нет ножа"));
}

console.log("\n=== 4. Sequence world preconditions ===");
{
  const wrongOrder = executeSequence({ steps: ["намазать_масло", "взять_нож", "положить_хлеб"] });
  check("impossible first step fails immediately", wrongOrder.failure?.code === "нет_ножа");

  const noKnife = executeSequence({
    steps: ["положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"],
  });
  check("missing knife stops at butter", noKnife.failure?.code === "нет_ножа" && noKnife.done.length === 1);

  const done = executeSequence({
    steps: ["взять_нож", "положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"],
  });
  check("full correct sequence passes", checkSequence(done).pass);
  check(`grid size is ${GRID_SIZE}`, GRID_SIZE === 4);
}

console.log(`\n${fail === 0 ? "TASK ENGINE: all checks passed" : `TASK ENGINE: ${fail} FAILED`} (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
