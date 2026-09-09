#!/usr/bin/env node
/**
 * The course must vary the WORLD, not only the tier.
 *
 * Measured across all 81 tasks on 2026-08-11 (`docs/CURRICULUM-STATUS-2026-08-11.md`): week 2
 * was fifteen tasks of one sandwich, fifteen week-1 tasks open with the same sentence, and a
 * week's «transfer» task lands back in the world it just practised — a fifth practice task
 * wearing a different name. Week 2 was rebuilt around three worlds in #17. The other four
 * weeks were not, and nothing stops the next author from writing the sandwich again.
 *
 * So this file is the invariant, written before the content that has to satisfy it. It is
 * step 1 of the order of work in that document: the test goes red first, and each week's PR
 * turns part of it green.
 *
 * Two modes:
 *
 *   npx tsx tests/curriculum-variety.test.mjs
 *       The full inventory. Exits 1 while any week violates anything. This is the red target.
 *
 *   npx tsx tests/curriculum-variety.test.mjs --ratchet
 *       Guards the weeks already listed as green, and fails when a week listed as red has
 *       quietly become clean (fix it, then register it). Never green-washes: the debt is
 *       printed in both modes. This is the mode that runs inside `npm test`.
 *
 * No network, no LLM, no database.
 */
import { loadCurriculum } from "../src/content/curriculum/index.ts";

/**
 * Weeks whose content satisfies every invariant below. A week joins this set in the SAME PR
 * that makes it true — never separately, or the guard protects nothing. The list may only
 * grow; the ratchet fails if a week outside it is already clean, so a finished week cannot
 * be left unregistered and silently regress later.
 */
const GREEN_WEEKS = new Set([1, 2, 4]);

const ratchet = process.argv.includes("--ratchet");

/**
 * The situation a task happens in. `worldId` is the sequence engine's key (it selects the
 * state machine); `world` is the family-neutral label for every other family, where the
 * world lives in the prose and no engine reads it. Either one declares the world.
 */
function worldOf(task) {
  const declared = (task.world ?? task.worldId ?? "").trim();
  return declared || null;
}

/** Same sentence with different spacing, case, ё/е or trailing dot is the same sentence. */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .replace(/[.!?…]+$/g, "")
    .trim();
}

function firstSentence(text) {
  const [head] = text.split(/(?<=[.!?…])\s+/);
  return normalize(head ?? text);
}

/** The brief: three things a task states before the child acts (08-UX-MONSTER-JOURNEY §2). */
function hasBrief(task) {
  return Boolean(task.goalRu?.trim() && task.givenRu?.length && task.doneWhenRu?.trim());
}

function duplicates(values) {
  const seen = new Map();
  for (const { key, id } of values) {
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(id);
  }
  return [...seen.entries()].filter(([, ids]) => ids.length > 1);
}

/** Every violation the week commits, each one a sentence an author can act on. */
function auditWeek(week, sessions) {
  const violations = [];
  const tasks = sessions.flatMap((s) => s.tasks.map((t) => ({ ...t, sessionId: s.id })));

  // 1 — the world is declared. Until it is, "which world" is a guess from prose, and
  //     checks 2 and 3 cannot be run at all.
  const undeclared = tasks.filter((t) => !worldOf(t));
  if (undeclared.length) {
    violations.push({
      code: "WORLD_NOT_DECLARED",
      message: `${undeclared.length} из ${tasks.length} задач не объявляют мир (world / worldId) — проверки 2 и 3 по этой неделе не выполнены`,
      examples: undeclared.slice(0, 4).map((t) => t.id),
    });
  } else {
    // 2 — a week is not one world.
    const worlds = new Set(tasks.map(worldOf));
    if (worlds.size < 2) {
      violations.push({
        code: "ONE_WORLD_PER_WEEK",
        message: `вся неделя проходит в одном мире «${[...worlds][0]}» — уровень меняется, ситуация нет`,
        examples: sessions.map((s) => s.id),
      });
    }

    // 3 — the transfer task leaves the world it practised.
    for (const session of sessions) {
      const home = new Set(
        session.tasks.filter((t) => t.role !== "transfer").map(worldOf)
      );
      for (const transfer of session.tasks.filter((t) => t.role === "transfer")) {
        if (home.has(worldOf(transfer))) {
          violations.push({
            code: "TRANSFER_STAYS_HOME",
            message: `${session.id}: перенос «${transfer.id}» остаётся в мире «${worldOf(transfer)}», который эта сессия и отрабатывала`,
            examples: [transfer.id],
          });
        }
      }
    }
  }

  // 4 — no sentence is served twice inside one week.
  const sameOpening = duplicates(
    tasks.map((t) => ({ key: firstSentence(t.promptRu), id: t.id }))
  );
  for (const [sentence, ids] of sameOpening) {
    violations.push({
      code: "REPEATED_OPENING",
      message: `${ids.length} задач открываются одной фразой «${sentence}»`,
      examples: ids.slice(0, 6),
    });
  }
  const samePrompt = duplicates(
    tasks.map((t) => ({ key: normalize(t.promptRu), id: t.id }))
  ).filter(([key]) => !sameOpening.some(([opening]) => opening === key));
  for (const [prompt, ids] of samePrompt) {
    violations.push({
      code: "REPEATED_PROMPT",
      message: `${ids.length} задач имеют дословно одинаковую формулировку «${prompt}»`,
      examples: ids.slice(0, 6),
    });
  }

  // 5 — every task carries the brief.
  const unbriefed = tasks.filter((t) => !hasBrief(t));
  if (unbriefed.length) {
    violations.push({
      code: "BRIEF_MISSING",
      message: `${unbriefed.length} из ${tasks.length} задач без брифа (goalRu / givenRu / doneWhenRu)`,
      examples: unbriefed.slice(0, 4).map((t) => t.id),
    });
  }

  return { week, sessionCount: sessions.length, taskCount: tasks.length, violations };
}

const byWeek = new Map();
for (const session of loadCurriculum()) {
  if (!byWeek.has(session.week)) byWeek.set(session.week, []);
  byWeek.get(session.week).push(session);
}

const reports = [...byWeek.entries()]
  .sort(([a], [b]) => a - b)
  .map(([week, sessions]) => auditWeek(week, sessions));

let failed = 0;
const fail = (line) => {
  failed += 1;
  console.log(`  FAIL  ${line}`);
};

console.log("=== разнообразие курса: мир, перенос, формулировка, бриф ===\n");

for (const report of reports) {
  const registeredGreen = GREEN_WEEKS.has(report.week);
  const label = `неделя ${report.week} (${report.taskCount} задач)`;

  if (!report.violations.length) {
    console.log(`  PASS  ${label}: инвариант выполнен`);
    if (!registeredGreen) {
      fail(
        `${label} уже чистая, но её нет в GREEN_WEEKS — добавь ${report.week} в список в этом же PR, иначе регресс никто не заметит`
      );
    }
    continue;
  }

  console.log(`  ДОЛГ  ${label}: ${report.violations.length} нарушений`);
  for (const violation of report.violations) {
    console.log(`        · [${violation.code}] ${violation.message}`);
    console.log(`          ${violation.examples.join(", ")}`);
  }
  if (registeredGreen) {
    fail(`${label} зарегистрирована как зелёная, но нарушает инвариант — это регресс`);
  } else if (!ratchet) {
    fail(`${label}: ${report.violations.length} нарушений`);
  }
}

const debtWeeks = reports.filter((r) => r.violations.length);
const debtTotal = debtWeeks.reduce((sum, r) => sum + r.violations.length, 0);

console.log(
  `\nДОЛГ: ${debtTotal} нарушений в неделях ${debtWeeks.map((r) => r.week).join(", ") || "—"}` +
    ` · зелёных недель ${GREEN_WEEKS.size} из ${reports.length}`
);
console.log(
  `CURRICULUM VARIETY${ratchet ? " (ratchet)" : ""}: ${failed === 0 ? "all passed" : "FAILURES"} (${failed} failed)`
);
process.exit(failed === 0 ? 0 : 1);
