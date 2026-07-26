// The measurement that decides the design. For every fixture it asks a real model to interpret
// a child's words, then classifies the answer:
//
//   literal   — the model returned exactly what was said, gaps and all
//   repaired  — the model filled a gap, reordered steps, or invented content. This is the
//               failure that makes the course impossible, so it is counted separately.
//   refused   — the model declined an instruction that was in fact determinate
//   error     — malformed output or a transport failure
//
// The interpreter never receives the target. Targets live in the fixtures and are used only
// after the call returns.

import { readFileSync } from "node:fs";
import { families } from "./lib/families.mjs";
import { makeClient, interpret } from "./lib/interpreter.mjs";
import { fixtures as gridFixtures } from "./fixtures/grid-draw.fixtures.mjs";
import { fixtures as seqFixtures } from "./fixtures/sequence-world.fixtures.mjs";

// Keys are read from a local env file when one is pointed at, and never echoed.
if (process.env.SPIKE_ENV_FILE) {
  for (const line of readFileSync(process.env.SPIKE_ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const REPEATS = Number(process.env.SPIKE_REPEATS ?? 2);
const DELAY_MS = Number(process.env.SPIKE_DELAY_MS ?? 400);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sortedCells = (cells) => [...cells].map((c) => c.join(",")).sort().join("|");
const REFUSALS = ["underspecified", "irrelevant"];

/**
 * A malformed program is a schema failure, not a repair. The distinction is not cosmetic:
 * `repaired` is the number that decides whether the design survives, so anything that is
 * merely a broken payload must be kept out of it. In production this same check makes the
 * monster say it did not understand, rather than executing garbage.
 */
function malformed(family, program) {
  if (family.id === "grid-draw") {
    const cells = program.cells;
    if (!Array.isArray(cells)) return "cells is not an array";
    const bad = cells.find((c) => !Array.isArray(c) || c.length !== 2 || !c.every(Number.isFinite));
    return bad === undefined ? null : `bad cell ${JSON.stringify(bad)}`;
  }
  const steps = program.steps;
  if (!Array.isArray(steps)) return "steps is not an array";
  const bad = steps.find((s) => typeof s !== "string" || !family.ACTIONS.includes(s));
  return bad === undefined ? null : `unknown step ${JSON.stringify(bad)}`;
}

function classify(fixture, family, program) {
  const status = program?.status;
  if (status !== "ok" && !REFUSALS.includes(status)) {
    return { verdict: "error", note: `unknown status ${JSON.stringify(status)}` };
  }

  // A refusal. Which of the two refusal words the model chose changes only the wording the
  // child sees, so it is reported but not counted as a failure of literalness.
  if (status !== "ok") {
    if (fixture.expect.status === "ok") {
      return { verdict: "refused", note: `${status}: ${program.reason ?? ""}`.slice(0, 90) };
    }
    return fixture.expect.allowed.includes(status)
      ? { verdict: "literal" }
      : { verdict: "literal", note: `refused as "${status}" rather than ${fixture.expect.allowed.join("/")}`, differentRefusal: true };
  }

  const schemaError = malformed(family, program);
  if (schemaError) return { verdict: "error", note: schemaError };

  if (fixture.expect.status !== "ok") {
    if (fixture.expect.alsoAcceptLiteral && family.id === "grid-draw") {
      const accept = sortedCells(fixture.expect.alsoAcceptLiteral.map(([r, c]) => [r - 1, c - 1]));
      if (sortedCells(program.cells) === accept) return { verdict: "literal", note: "kept out-of-bounds cell" };
    }
    const shown = family.id === "grid-draw" ? sortedCells(program.cells) : JSON.stringify(program.steps);
    return { verdict: "repaired", note: `invented ${shown}` };
  }

  if (family.id === "grid-draw") {
    // The fixture stores 1-based cells; the program has been normalised to 0-based.
    const want = sortedCells(fixture.expect.cells.map(([r, c]) => [r - 1, c - 1]));
    const got = sortedCells(program.cells);
    if (want === got) return { verdict: "literal" };
    const wantSet = new Set(want.split("|"));
    const added = [...new Set(got.split("|"))].filter((k) => k && !wantSet.has(k));
    return added.length
      ? { verdict: "repaired", note: `added ${added.join(" ")}` }
      : { verdict: "error", note: `dropped cells, got ${got}` };
  }

  const want = JSON.stringify(fixture.expect.steps);
  const got = JSON.stringify(program.steps);
  if (want === got) return { verdict: "literal" };
  const wantCounts = fixture.expect.steps.length;
  const extra = program.steps.filter((s) => !fixture.expect.steps.includes(s));
  if (extra.length) return { verdict: "repaired", note: `inserted ${extra.join(" ")}` };
  if (program.steps.length === wantCounts) return { verdict: "repaired", note: `reordered to ${got}` };
  return { verdict: "error", note: `got ${got}` };
}

async function run() {
  const provider = process.env.SPIKE_PROVIDER ?? "gemini";
  const conn = makeClient(provider);
  console.log(`\nprovider: ${conn.provider}   model: ${conn.model}   repeats: ${REPEATS}\n`);

  const suites = [
    { family: families["grid-draw"], fixtures: gridFixtures },
    { family: families["sequence-world"], fixtures: seqFixtures },
  ];

  const rows = [];
  const latencies = [];
  let promptTokens = 0;
  let completionTokens = 0;

  for (const { family, fixtures } of suites) {
    console.log(`--- ${family.id} ---`);
    for (const fixture of fixtures) {
      const verdicts = [];
      let lastNote = "";
      let differentRefusal = false;
      for (let attempt = 0; attempt < REPEATS; attempt++) {
        try {
          const result = await interpret(conn, family, fixture.utterance);
          latencies.push(result.latencyMs);
          promptTokens += result.promptTokens ?? 0;
          completionTokens += result.completionTokens ?? 0;
          const outcome = classify(fixture, family, result.program);
          verdicts.push(outcome.verdict);
          if (outcome.differentRefusal) differentRefusal = true;
          if (outcome.note) lastNote = outcome.note;
        } catch (error) {
          verdicts.push("error");
          lastNote = String(error.message ?? error).slice(0, 110);
        }
        await sleep(DELAY_MS);
      }
      const stable = new Set(verdicts).size === 1;
      const worst = verdicts.includes("repaired")
        ? "repaired"
        : verdicts.includes("error")
          ? "error"
          : verdicts.includes("refused")
            ? "refused"
            : "literal";
      rows.push({ id: fixture.id, kind: fixture.kind, verdict: worst, stable, note: lastNote, differentRefusal });
      const flag = { literal: "OK  ", repaired: "REPAIR", refused: "REFUSE", error: "ERR " }[worst];
      console.log(`  ${flag} ${stable ? " " : "~"} ${fixture.id.padEnd(38)} ${lastNote}`);
    }
  }

  const total = rows.length;
  const literal = rows.filter((r) => r.verdict === "literal").length;
  const repaired = rows.filter((r) => r.verdict === "repaired");
  const traps = rows.filter((r) => r.kind === "repair-trap");
  const trapsHeld = traps.filter((r) => r.verdict === "literal").length;
  const unstable = rows.filter((r) => !r.stable).length;
  const sorted = [...latencies].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100))] ?? 0;

  const errors = rows.filter((r) => r.verdict === "error");
  const refused = rows.filter((r) => r.verdict === "refused");
  const differentRefusals = rows.filter((r) => r.differentRefusal);

  console.log("\n=== result ===");
  console.log(`  literalness       ${literal}/${total}  (${((literal / total) * 100).toFixed(0)}%)`);
  console.log(`  repair-traps held ${trapsHeld}/${traps.length}   <- the design depends on this`);
  console.log(`  repairs           ${repaired.length}${repaired.length ? `: ${repaired.map((r) => r.id).join(", ")}` : ""}`);
  console.log(`  wrong refusals    ${refused.length}${refused.length ? `: ${refused.map((r) => r.id).join(", ")}` : ""}`);
  console.log(`  schema errors     ${errors.length}${errors.length ? `: ${errors.map((r) => r.id).join(", ")}` : ""}`);
  console.log(`  refusal word only ${differentRefusals.length}${differentRefusals.length ? `: ${differentRefusals.map((r) => r.id).join(", ")}` : ""}`);
  console.log(`  unstable at t=0   ${unstable}/${total}`);
  console.log(`  latency ms        p50 ${pct(50)}  p90 ${pct(90)}  max ${sorted[sorted.length - 1] ?? 0}`);
  console.log(`  tokens per call   prompt ~${Math.round(promptTokens / latencies.length)}  completion ~${Math.round(completionTokens / latencies.length)}`);
  console.log("");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
