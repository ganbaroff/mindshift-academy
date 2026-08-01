#!/usr/bin/env node
/**
 * Deterministic gate for the executable-task engine (thinking curriculum Phase 1).
 * No network, no LLM, no database. Ported from spikes/curriculum-engine/run-offline.mjs.
 */
import {
  GRID_SIZE,
  checkClaimCheck,
  checkGrid,
  checkPattern,
  checkRuleRunner,
  checkSequence,
  executeClaimCheck,
  executeGrid,
  executePattern,
  executeRuleRunner,
  executeSequence,
  renderClaimDiff,
  renderGridDiff,
  renderPatternDiff,
  renderRuleDiff,
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

console.log("\n=== 5. rule-runner executor (edge cases) ===");
{
  const maps = [
    { id: "open", ahead: "open", successWhen: "goal" },
    { id: "wall", ahead: "wall", successWhen: "wait_on_wall" },
    { id: "trap", ahead: "trap", successWhen: "stop_on_trap" },
  ];
  const good = executeRuleRunner(
    { rules: [{ if: { kind: "tile", value: "open" }, then: "step", else: "stop" }] },
    maps
  );
  check("rule with else passes all maps", checkRuleRunner(good).pass);

  const noElse = executeRuleRunner(
    { rules: [{ if: { kind: "tile", value: "open" }, then: "step" }] },
    maps
  );
  // default else=stop → wall/trap avoid via stop — also passes; force fail with always-step
  const alwaysStep = executeRuleRunner(
    { rules: [{ if: { kind: "always" }, then: "step" }] },
    maps
  );
  check("blind step fails wall/trap", !checkRuleRunner(alwaysStep).pass);

  const empty = executeRuleRunner({ rules: [] }, maps);
  check("empty rules fail", !checkRuleRunner(empty).pass);

  const text = renderRuleDiff(alwaysStep, checkRuleRunner(alwaysStep));
  check("rule diff shame-free", !/ошибк|неправильн|провал/i.test(text));
  void noElse;
}

console.log("\n=== 6. pattern-expand executor (edge cases) ===");
{
  const arith = executePattern({ rule: { kind: "arithmetic", start: 1, step: 1 } }, 5);
  check("arithmetic expands", checkPattern(arith, ["1", "2", "3", "4", "5"]).pass);

  const wrong = checkPattern(arith, ["1", "2", "3", "4", "банан"]);
  check("mismatch fails and names index", !wrong.pass && wrong.mismatches[0]?.index === 4);

  const cycle = executePattern({ rule: { kind: "cycle", items: ["а", "б"] } }, 4);
  check("cycle expands", checkPattern(cycle, ["а", "б", "а", "б"]).pass);

  const copiedOutput = executePattern(
    { rule: { kind: "cycle", items: ["а", "б", "а", "б"] } },
    4
  );
  const copiedVerdict = checkPattern(copiedOutput, ["а", "б", "а", "б"]);
  check(
    "full expected output is not accepted as a cycle rule",
    !copiedVerdict.pass && copiedVerdict.ruleIssue === "copied_output"
  );

  const emptyItems = executePattern({ rule: { kind: "cycle", items: [] } }, 2);
  check("empty cycle yields placeholders", emptyItems.terms.join(",") === "?,?");

  const ptext = renderPatternDiff(arith, ["1", "2", "3", "4", "банан"], wrong);
  check("pattern diff shame-free", !/ошибк|неправильн|провал/i.test(ptext));
}

console.log("\n=== 7. claim-check executor (edge cases) ===");
{
  const claims = [
    { id: "a", text: "2+2=4", truth: true },
    { id: "b", text: "confidence=truth", truth: false },
  ];
  const good = executeClaimCheck({ labels: { a: true, b: false } }, claims);
  check("correct labels pass", checkClaimCheck(good).pass);

  const missFalse = executeClaimCheck({ labels: { a: true, b: true } }, claims);
  const v = checkClaimCheck(missFalse);
  check("missed false caught", !v.pass && v.missedFalseIds.includes("b"));

  const unlabeled = executeClaimCheck({ labels: { a: true } }, claims);
  check("unlabeled fails", !checkClaimCheck(unlabeled).pass && checkClaimCheck(unlabeled).unlabeledIds.includes("b"));

  const ctext = renderClaimDiff(missFalse, v);
  check("claim diff shame-free", !/ошибк|неправильн|провал/i.test(ctext));
}

console.log(`\n${fail === 0 ? "TASK ENGINE: all checks passed" : `TASK ENGINE: ${fail} FAILED`} (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
