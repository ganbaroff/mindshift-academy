#!/usr/bin/env node
/**
 * Dual synthetic children for Week 1 Session 1.
 * good-child: precise utterances → expect pass
 * bad-child: vague utterances → expect fail / unclear
 *
 * Uses interpreter + deterministic checker (live model if keys present).
 * Run: npm run test:dual-children
 */
import { week1Session1 } from "../src/content/curriculum/week-1/session-1.ts";
import { resolveGridAttempt } from "../src/lib/tasks/attempt.ts";
import { interpretUtterance } from "../src/lib/tasks/interpreter.ts";
import { HINT_CRYSTAL_COST, STARTER_CRYSTALS, TASK_PASS_CRYSTAL_REWARD } from "../src/content/curriculum/types.ts";
import { toPublicSession } from "../src/content/curriculum/types.ts";

const hasGemini = Boolean(process.env.GEMINI_API_KEY);
const hasAzure = Boolean(process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_API_KEY);

/** Exact-enough Russian for each w1-s1 target (good child). */
const GOOD = {
  "w1s1-collision": "закрась весь верхний ряд",
  "w1s1-p1": "закрась весь левый столбец",
  "w1s1-p2": "закрась весь нижний ряд",
  "w1s1-p3": "закрась клетку строка 2 столбец 1 и строка 2 столбец 2",
  "w1s1-p4": "в верхнем ряду закрась первые три клетки слева",
  "w1s1-p5": "во втором ряду закрась две клетки справа",
  "w1s1-transfer": "закрась весь правый столбец",
};

/** Vague / wrong Russian (bad child) — must not pass. */
const BAD = {
  "w1s1-collision": "нарисуй домик",
  "w1s1-p1": "закрась что-нибудь красивое",
  "w1s1-p2": "сделай как надо",
  "w1s1-p3": "две клетки посередине",
  "w1s1-p4": "почти весь верх",
  "w1s1-p5": "справа чуть-чуть",
  "w1s1-transfer": "столбец",
};

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

console.log("\n=== content / economy contracts ===");
{
  const pub = toPublicSession(week1Session1);
  check("public session strips hintRu", pub.tasks.every((t) => !("hintRu" in t)));
  check("public session marks hintAvailable", pub.tasks.every((t) => t.hintAvailable === true));
  check(
    "every task has scaffold hint (not cell dump)",
    week1Session1.tasks.every(
      (t) =>
        t.hintRu.length > 20 &&
        !t.hintRu.includes("[0,") &&
        !/\(\d,\d\)/.test(t.hintRu.replace(/\s/g, ""))
    )
  );
  check("hint cost < starter pack", HINT_CRYSTAL_COST < STARTER_CRYSTALS);
  check("pass reward positive", TASK_PASS_CRYSTAL_REWARD > 0);
  check(
    "free prompts do not name exact figure for practice",
    week1Session1.tasks
      .filter((t) => t.role === "practice")
      .every((t) => !/весь (левый|правый|верхний|нижний)/i.test(t.promptRu))
  );
}

if (!hasGemini && !hasAzure) {
  const inCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
  console.log("\n=== live interpreter SKIPPED (no GEMINI/AZURE key) ===");
  if (inCi) {
    console.error(
      "\nDUAL-CHILDREN: FAIL — live half skipped in CI (would give false confidence). Set GEMINI_API_KEY or AZURE_OPENAI_API_KEY.\n"
    );
    process.exit(1);
  }
  console.log(
    `\nDUAL-CHILDREN: ${fail === 0 ? "contracts ok" : "FAILED"} (${pass} passed, live skipped locally)\n`
  );
  process.exit(fail === 0 ? 0 : 1);
}

console.log("\n=== good-child (precise) ===");
for (const task of week1Session1.tasks) {
  const utterance = GOOD[task.id];
  if (!utterance || !task.target) {
    check(`${task.id} has good script`, false);
    continue;
  }
  try {
    const interpreted = await interpretUtterance("grid-draw", utterance);
    if (interpreted.family !== "grid-draw") {
      check(`good ${task.id}`, false, "wrong family");
      continue;
    }
    const outcome = resolveGridAttempt(interpreted.program, task.target);
    check(`good ${task.id} passes`, outcome.pass === true, outcome.feedback.slice(0, 80));
  } catch (e) {
    check(`good ${task.id}`, false, String(e?.message || e));
  }
}

console.log("\n=== bad-child (vague) ===");
for (const task of week1Session1.tasks) {
  const utterance = BAD[task.id];
  if (!utterance || !task.target) {
    check(`${task.id} has bad script`, false);
    continue;
  }
  try {
    const interpreted = await interpretUtterance("grid-draw", utterance);
    if (interpreted.family !== "grid-draw") {
      check(`bad ${task.id} does not pass`, true);
      continue;
    }
    const outcome = resolveGridAttempt(interpreted.program, task.target);
    check(`bad ${task.id} does not pass`, outcome.pass === false, `got pass=${outcome.pass}`);
  } catch {
    // Interpreter hard-fail still counts as "did not pass"
    check(`bad ${task.id} does not pass`, true, "interpret error (ok for bad)");
  }
}

console.log(
  `\n${fail === 0 ? "DUAL-CHILDREN: all passed" : `DUAL-CHILDREN: ${fail} FAILED`} (${pass} passed)\n`
);
process.exit(fail === 0 ? 0 : 1);
