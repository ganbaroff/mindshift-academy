#!/usr/bin/env node
/**
 * Deterministic interpreter contracts — no network.
 * Empty ok → unclear; coerce legacy statuses; attempt feedback never blames; fixtures well-formed.
 */
import {
  coerceRawProgram,
  interpretUtterance,
  parseGridProgram,
  parseSequenceProgram,
} from "../src/lib/tasks/interpreter.ts";
import { resolveGridAttempt, resolveSequenceAttempt } from "../src/lib/tasks/attempt.ts";
import { unclearMessage } from "../src/lib/tasks/unclear-copy.ts";
import { GRID_FIXTURES } from "../src/lib/tasks/fixtures/grid-draw.ts";
import { SEQUENCE_FIXTURES } from "../src/lib/tasks/fixtures/sequence-world.ts";
import { UNCLEAR_REASON_CODES } from "../src/lib/tasks/unclear-copy.ts";
import { fakeInterpretUtterance } from "../src/lib/tasks/fake-interpreter.ts";

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

console.log("\n=== pattern rule-form preflight ===");
{
  let providerCalls = 0;
  const conn = {
    model: "test-model",
    client: {
      chat: {
        completions: {
          create: async () => {
            providerCalls += 1;
            return {
              choices: [
                { message: { content: '{"status":"ok","rule":{"kind":"arithmetic","start":1,"step":1}}' } },
              ],
            };
          },
        },
      },
    },
  };
  const copiedList = await interpretUtterance("pattern-expand", "1, 2, 3, 4", conn);
  check(
    "numeric output list is rejected before provider inference",
    copiedList.program.status === "unclear" &&
      copiedList.program.reasonCode === "copied_output" &&
      providerCalls === 0
  );

  const copiedDescendingList = await interpretUtterance(
    "pattern-expand",
    "5, 4, 3, 2, 1, 0, -1, -2, -3, -4",
    conn
  );
  check(
    "negative terms do not masquerade as a subtraction rule",
    copiedDescendingList.program.status === "unclear" &&
      copiedDescendingList.program.reasonCode === "copied_output" &&
      providerCalls === 0
  );
  const fakeDescending = fakeInterpretUtterance(
    "pattern-expand",
    "5, 4, 3, 2, 1, 0, -1, -2, -3, -4"
  );
  check(
    "fake interpreter applies the same copied-output preflight",
    fakeDescending.status === "unclear" && fakeDescending.reasonCode === "copied_output"
  );

  const explicitRule = await interpretUtterance(
    "pattern-expand",
    "начинай с 1 и каждый раз прибавляй 1",
    conn
  );
  check(
    "explicit arithmetic rule reaches literal interpreter",
    explicitRule.program.status === "ok" && providerCalls === 1
  );
}

console.log("\n=== empty / legacy coerce ===");
{
  const empty = coerceRawProgram("grid-draw", { status: "ok", cells: [] });
  check("empty ok cells → unclear no_actions", empty.status === "unclear" && empty.reasonCode === "no_actions");

  const emptySeq = coerceRawProgram("sequence-world", { status: "ok", steps: [] });
  check("empty ok steps → unclear no_actions", emptySeq.status === "unclear" && emptySeq.reasonCode === "no_actions");

  const legacy = coerceRawProgram("grid-draw", { status: "underspecified", reason: "не сказано" });
  check("underspecified → unclear", legacy.status === "unclear");

  const irr = coerceRawProgram("sequence-world", { status: "irrelevant", reason: "анекдот" });
  check("irrelevant → unclear", irr.status === "unclear");
}

console.log("\n=== parse + resolve never leaks model free-text ===");
{
  const program = parseGridProgram({ status: "unclear", reason: "какая-то модельная фраза про ошибку" });
  check("parse yields closed reasonCode", program.status === "unclear" && UNCLEAR_REASON_CODES.includes(program.reasonCode));

  const outcome = resolveGridAttempt(program, [[0, 0]]);
  const banned = ["неправильно", "ошибка", "неверно", "какая-то модельн"];
  check("feedback uses our copy only", !banned.some((w) => outcome.feedback.includes(w)));
  check("feedback non-empty", outcome.feedback.length > 10);

  const seqBad = parseSequenceProgram({ status: "ok", steps: ["поджарить"] });
  check("unknown step → out_of_vocabulary", seqBad.status === "unclear" && seqBad.reasonCode === "out_of_vocabulary");
}

console.log("\n=== attempt pass only from checker ===");
{
  const okProg = parseGridProgram({ status: "ok", cells: [[1, 1], [1, 2]] });
  const hit = resolveGridAttempt(okProg, [[0, 0], [0, 1]]);
  check("exact grid pass", hit.pass === true);

  const miss = resolveGridAttempt(okProg, [[0, 0], [0, 1], [1, 0]]);
  check("incomplete grid fail", miss.pass === false);

  const seq = parseSequenceProgram({
    status: "ok",
    steps: ["взять_нож", "положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"],
  });
  check("full sequence pass", resolveSequenceAttempt(seq).pass === true);

  const stuck = parseSequenceProgram({ status: "ok", steps: ["намазать_масло"] });
  check("stuck sequence fail", resolveSequenceAttempt(stuck).pass === false);
}

console.log("\n=== fixtures well-formed ===");
{
  check("grid fixture count", GRID_FIXTURES.length >= 20, String(GRID_FIXTURES.length));
  check("sequence fixture count", SEQUENCE_FIXTURES.length >= 10, String(SEQUENCE_FIXTURES.length));
  const traps = [...GRID_FIXTURES, ...SEQUENCE_FIXTURES].filter((f) => f.kind === "repair-trap");
  check("repair traps present", traps.length >= 6, String(traps.length));
  for (const code of UNCLEAR_REASON_CODES) {
    check(`copy for ${code}`, unclearMessage(code).length > 5);
  }
}

console.log(`\n${fail === 0 ? "INTERPRETER CONTRACT: all passed" : `INTERPRETER CONTRACT: ${fail} FAILED`} (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
