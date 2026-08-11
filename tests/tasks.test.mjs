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
  resolvePatternAttempt,
  renderRuleDiff,
  renderSequenceDiff,
  SEQUENCE_WORLDS,
  sequenceWorld,
} from "../src/lib/tasks/index.ts";
import {
  PUBLIC_SEQUENCE_WORLDS,
  displayOrder,
} from "../src/lib/tasks/sequence-worlds-public.ts";
import { loadCurriculum } from "../src/content/curriculum/index.ts";

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
  const copiedOutcome = resolvePatternAttempt(
    { status: "ok", rule: { kind: "cycle", items: ["а", "б", "а", "б"] } },
    ["а", "б", "а", "б"],
    4
  );
  check(
    "copied-output reason reaches attempt outcome",
    !copiedOutcome.pass && copiedOutcome.reasonCode === "copied_output"
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

// ---------------------------------------------------------------------------
// Rule worlds — the engine stopped deciding what the right answer was
// ---------------------------------------------------------------------------
{
  /**
   * The pre-2026-08-11 engine, copied verbatim in behaviour, so "the shim changes nothing"
   * is a proof and not a promise. It is the ONLY place the three old success regimes still
   * exist; when the last legacy map is rewritten, this and the shim both go.
   */
  const legacyPass = (map, action) => {
    const avoid = action === "stop" || action === "wait" || action === "turn_left" || action === "turn_right";
    if (map.successWhen === "goal") {
      if (map.ahead === "goal") return action === "step";
      if (map.ahead === "wall" || map.ahead === "trap") return avoid;
      return action === "step";
    }
    if (map.successWhen === "stop_on_trap") {
      if (map.ahead === "trap") return avoid;
      return action === "step";
    }
    if (map.ahead === "wall") return avoid;
    return action === "step";
  };

  const legacyMaps = loadCurriculum()
    .flatMap((session) => session.tasks)
    .flatMap((task) => task.ruleMaps ?? [])
    .filter((map) => typeof map.ahead === "string");
  check("the course still has legacy maps to protect", legacyMaps.length >= 70, String(legacyMaps.length));

  let mismatches = 0;
  for (const map of legacyMaps) {
    for (const action of ["step", "turn_left", "turn_right", "wait", "stop"]) {
      const program = { rules: [{ if: { kind: "always" }, then: action }] };
      const now = checkRuleRunner(executeRuleRunner(program, [map])).pass;
      if (now !== legacyPass(map, action)) mismatches += 1;
    }
  }
  check(
    `every legacy map keeps its old verdict for every action (${legacyMaps.length} maps × 5)`,
    mismatches === 0,
    `${mismatches} verdicts changed`
  );

  // The answer moved into content: a map can now say what counts as right.
  const authored = {
    id: "m-authored",
    signals: { ahead: "trap" },
    expect: ["wait"],
    okRu: "я подождал у ловушки",
    missRu: "я не подождал",
  };
  const waited = executeRuleRunner({ rules: [{ if: { kind: "always" }, then: "wait" }] }, [authored]);
  check("an authored map accepts exactly what it says", checkRuleRunner(waited).pass);
  const stopped = executeRuleRunner({ rules: [{ if: { kind: "always" }, then: "stop" }] }, [authored]);
  check(
    "and refuses what the old engine would have accepted",
    !checkRuleRunner(stopped).pass,
    "stop passed a map that expects wait"
  );
  check("the monster uses the map's own words", waited.results[0].note.includes("я подождал у ловушки"));

  // Conditions can name a signal now, not only «что впереди».
  const bySignal = executeRuleRunner(
    { rules: [{ if: { kind: "signal", signal: "ahead", value: "trap" }, then: "wait" }] },
    [authored]
  );
  check("a signal condition matches the same situation", checkRuleRunner(bySignal).pass);

  // An action id reaching this engine came through the interpreter, so it is
  // model-influenced. It must never be printed back to a child verbatim.
  const bogus = executeRuleRunner({ rules: [{ if: { kind: "always" }, then: "delete_all" }] }, [authored]);
  check("an unknown action does not pass", !checkRuleRunner(bogus).pass);
  check(
    "and is never echoed to the child",
    !bogus.results[0].note.includes("delete_all"),
    bogus.results[0].note
  );

  check("no rules at all is still not a pass", !checkRuleRunner(executeRuleRunner({ rules: [] }, [authored])).pass);
}

// ---------------------------------------------------------------------------
// Sequence worlds — the week-2 family stopped being one hardcoded sandwich
// ---------------------------------------------------------------------------
{
  const ids = Object.keys(SEQUENCE_WORLDS);
  check("more than one world exists at all", ids.length >= 3, ids.join(", "));

  for (const world of Object.values(SEQUENCE_WORLDS)) {
    // THE invariant. Content, tests and the browser harness all lean on it: the declared
    // action order is a valid solution, so every world has one canonical answer to drive.
    const verdict = checkSequence(executeSequence({ steps: [...world.actions] }, world));
    check(
      `${world.id}: declared action order solves the world`,
      verdict.pass,
      JSON.stringify(verdict.failure)
    );

    // A world that can be authored can be authored wrong. These catch the ways.
    check(
      `${world.id}: every action has a rule`,
      world.actions.every((a) => Boolean(world.rules[a]))
    );
    check(
      `${world.id}: every rule belongs to an action`,
      Object.keys(world.rules).every((a) => world.actions.includes(a))
    );
    const counters = new Set(Object.keys(world.initial));
    check(
      `${world.id}: every counter a rule touches starts somewhere`,
      Object.values(world.rules).every(
        (rule) =>
          (rule.requires ?? []).every((r) => counters.has(r.key)) &&
          Object.keys(rule.effects).every((k) => counters.has(k))
      )
    );
    check(`${world.id}: the goal counter exists`, counters.has(world.goalKey));
    check(
      `${world.id}: every failure a rule can raise has words`,
      Object.values(world.rules).every((rule) =>
        (rule.requires ?? []).every((r) => Boolean(world.failureRu[r.failure]))
      )
    );

    // Doing nothing is never success, and the monster says what is still undone.
    const empty = executeSequence({ steps: [] }, world);
    check(`${world.id}: an empty plan does not pass`, !checkSequence(empty).pass);
    check(
      `${world.id}: and the monster names what is missing`,
      renderSequenceDiff(empty, checkSequence(empty)).includes("Шаги закончились")
    );

    // The buttons must not spell the answer. The old surface listed actions in solution
    // order, which turned week 2 into a top-to-bottom click.
    const shown = displayOrder(PUBLIC_SEQUENCE_WORLDS[world.id]);
    check(
      `${world.id}: the buttons are not the answer in order`,
      JSON.stringify(shown) !== JSON.stringify([...world.actions])
    );
    check(
      `${world.id}: the buttons still offer every action`,
      shown.length === world.actions.length && shown.every((a) => world.actions.includes(a))
    );
  }

  // Vocabulary is per world, so one world's plan is meaningless in another.
  const sandwichPlan = { steps: [...SEQUENCE_WORLDS.sandwich.actions] };
  const inPlant = executeSequence(sandwichPlan, SEQUENCE_WORLDS.plant);
  check(
    "a sandwich plan is refused in the plant world",
    !checkSequence(inPlant).pass && inPlant.failure?.code === "неизвестное_действие"
  );

  check(
    "an unknown world id falls back rather than throwing",
    sequenceWorld("no-such-world").id === "sandwich"
  );

  // The solution must not be in the browser bundle: the public module carries the scene,
  // the vocabulary and the labels, and nothing that reveals the order.
  for (const shown of Object.values(PUBLIC_SEQUENCE_WORLDS)) {
    check(
      `${shown.id}: the public world hides the rules`,
      !("rules" in shown) && !("initial" in shown) && !("goalKey" in shown)
    );
  }

  // Week 2 must never again be one world three sessions running.
  const week2 = loadCurriculum().filter((s) => s.week === 2);
  check(
    "every week-2 task names a world",
    week2.every((s) => s.tasks.every((t) => Boolean(t.worldId)))
  );
  check(
    "the three sessions of week 2 do not share one world",
    new Set(week2.map((s) => s.tasks.find((t) => t.role === "collision")?.worldId)).size === 3
  );
  check(
    "every session's transfer task leaves the world it practised",
    week2.every((s) => {
      const transfer = s.tasks.find((t) => t.role === "transfer");
      const practised = s.tasks.filter((t) => t.role !== "transfer").map((t) => t.worldId);
      return transfer && !practised.includes(transfer.worldId);
    })
  );
}

console.log(`\n${fail === 0 ? "TASK ENGINE: all checks passed" : `TASK ENGINE: ${fail} FAILED`} (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
