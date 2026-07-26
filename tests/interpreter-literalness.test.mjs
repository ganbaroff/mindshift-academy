#!/usr/bin/env node
/**
 * Live literalness gate for the product interpreter (enum reason codes).
 *
 * Hard conditions when keys are present:
 *   - zero repairs
 *   - literalness ≥ 95%
 *   - zero schema/transport errors on the suite
 *
 * Without a chat provider key the suite exits 0 with SKIP (same pattern as optional
 * live lanes). Set INTERPRETER_LIVE_REQUIRED=1 to fail when keys are missing (CI with secrets).
 *
 *   SPIKE_ENV_FILE=... npm run test:interpreter
 *   INTERPRETER_REPEATS=3 npm run test:interpreter
 */
import { readFileSync } from "node:fs";
import { interpretUtterance } from "../src/lib/tasks/interpreter.ts";
import { getChatClient } from "../src/lib/ai-provider.ts";
import { GRID_FIXTURES } from "../src/lib/tasks/fixtures/grid-draw.ts";
import { SEQUENCE_FIXTURES } from "../src/lib/tasks/fixtures/sequence-world.ts";

if (process.env.SPIKE_ENV_FILE) {
  for (const line of readFileSync(process.env.SPIKE_ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      let v = match[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[match[1]] = v;
    }
  }
}

const REPEATS = Number(process.env.INTERPRETER_REPEATS ?? 3);
const DELAY_MS = Number(process.env.INTERPRETER_DELAY_MS ?? 400);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sortedCells = (cells) =>
  [...cells]
    .map((c) => c.join(","))
    .sort()
    .join("|");

function classifyGrid(fixture, program) {
  if (program.status === "unclear") {
    if (fixture.expect.status === "ok") return { verdict: "refused", note: program.reasonCode };
    return { verdict: "literal" };
  }
  if (fixture.expect.status !== "ok") {
    if (fixture.expect.alsoAcceptLiteral) {
      const accept = sortedCells(fixture.expect.alsoAcceptLiteral.map(([r, c]) => [r - 1, c - 1]));
      if (sortedCells(program.cells) === accept) return { verdict: "literal", note: "kept out-of-bounds" };
    }
    return { verdict: "repaired", note: `invented ${sortedCells(program.cells)}` };
  }
  const want = sortedCells(fixture.expect.cells.map(([r, c]) => [r - 1, c - 1]));
  const got = sortedCells(program.cells);
  if (want === got) return { verdict: "literal" };
  const wantSet = new Set(want.split("|"));
  const added = [...new Set(got.split("|"))].filter((k) => k && !wantSet.has(k));
  return added.length
    ? { verdict: "repaired", note: `added ${added.join(" ")}` }
    : { verdict: "error", note: `dropped cells, got ${got}` };
}

function classifySeq(fixture, program) {
  if (program.status === "unclear") {
    if (fixture.expect.status === "ok") return { verdict: "refused", note: program.reasonCode };
    return { verdict: "literal" };
  }
  if (fixture.expect.status !== "ok") {
    return { verdict: "repaired", note: `invented ${JSON.stringify(program.steps)}` };
  }
  const want = JSON.stringify(fixture.expect.steps);
  const got = JSON.stringify(program.steps);
  if (want === got) return { verdict: "literal" };
  const extra = program.steps.filter((s) => !fixture.expect.steps.includes(s));
  if (extra.length) return { verdict: "repaired", note: `inserted ${extra.join(" ")}` };
  if (program.steps.length === fixture.expect.steps.length) {
    return { verdict: "repaired", note: `reordered to ${got}` };
  }
  return { verdict: "error", note: `got ${got}` };
}

async function main() {
  const conn = getChatClient();
  if (!conn) {
    if (process.env.INTERPRETER_LIVE_REQUIRED === "1") {
      console.error("INTERPRETER_LIVE_REQUIRED=1 but no chat provider configured");
      process.exit(1);
    }
    console.log("SKIP interpreter literalness — no Azure/Gemini/NVIDIA/OpenAI chat key");
    process.exit(0);
  }

  console.log(`\nprovider model: ${conn.model}   repeats: ${REPEATS}\n`);
  const rows = [];

  for (const fixture of GRID_FIXTURES) {
    const verdicts = [];
    let lastNote = "";
    for (let i = 0; i < REPEATS; i++) {
      try {
        const result = await interpretUtterance("grid-draw", fixture.utterance, conn);
        const { verdict, note } = classifyGrid(fixture, result.program);
        verdicts.push(verdict);
        if (note) lastNote = note;
      } catch (e) {
        verdicts.push("error");
        lastNote = String(e.message ?? e).slice(0, 100);
      }
      await sleep(DELAY_MS);
    }
    const worst = verdicts.includes("repaired")
      ? "repaired"
      : verdicts.includes("error")
        ? "error"
        : verdicts.includes("refused")
          ? "refused"
          : "literal";
    rows.push({ id: fixture.id, kind: fixture.kind, verdict: worst, note: lastNote });
    const flag = { literal: "OK  ", repaired: "REPAIR", refused: "REFUSE", error: "ERR " }[worst];
    console.log(`  ${flag} ${fixture.id.padEnd(40)} ${lastNote}`);
  }

  for (const fixture of SEQUENCE_FIXTURES) {
    const verdicts = [];
    let lastNote = "";
    for (let i = 0; i < REPEATS; i++) {
      try {
        const result = await interpretUtterance("sequence-world", fixture.utterance, conn);
        const { verdict, note } = classifySeq(fixture, result.program);
        verdicts.push(verdict);
        if (note) lastNote = note;
      } catch (e) {
        verdicts.push("error");
        lastNote = String(e.message ?? e).slice(0, 100);
      }
      await sleep(DELAY_MS);
    }
    const worst = verdicts.includes("repaired")
      ? "repaired"
      : verdicts.includes("error")
        ? "error"
        : verdicts.includes("refused")
          ? "refused"
          : "literal";
    rows.push({ id: fixture.id, kind: fixture.kind, verdict: worst, note: lastNote });
    const flag = { literal: "OK  ", repaired: "REPAIR", refused: "REFUSE", error: "ERR " }[worst];
    console.log(`  ${flag} ${fixture.id.padEnd(40)} ${lastNote}`);
  }

  const total = rows.length;
  const literal = rows.filter((r) => r.verdict === "literal").length;
  const repaired = rows.filter((r) => r.verdict === "repaired");
  const errors = rows.filter((r) => r.verdict === "error");
  const traps = rows.filter((r) => r.kind === "repair-trap");
  const trapsHeld = traps.filter((r) => r.verdict === "literal").length;
  const rate = literal / total;

  console.log("\n=== result ===");
  console.log(`  literalness       ${literal}/${total}  (${(rate * 100).toFixed(0)}%)`);
  console.log(`  repair-traps held ${trapsHeld}/${traps.length}`);
  console.log(`  repairs           ${repaired.length}${repaired.length ? `: ${repaired.map((r) => r.id).join(", ")}` : ""}`);
  console.log(`  errors            ${errors.length}${errors.length ? `: ${errors.map((r) => r.id).join(", ")}` : ""}`);

  const ok = repaired.length === 0 && errors.length === 0 && rate >= 0.95;
  if (!ok) {
    console.error("\nLITERALNESS GATE FAILED (need 0 repairs, 0 errors, ≥95% literal)\n");
    process.exit(1);
  }
  console.log("\nLITERALNESS GATE PASSED\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
