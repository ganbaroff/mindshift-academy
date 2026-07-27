#!/usr/bin/env node
/**
 * Good-child Week 1 runner (w1-s1, w1-s2, w1-s3).
 * Precise Russian → interpretUtterance('grid-draw') → resolveGridAttempt.
 * Also checks pedagogy contracts + sessionComplete + toPublicSession.
 *
 * Writes: docs/superpowers/specs/2026-07-27-good-child-week1-receipt.md
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { week1Session1 } from "../src/content/curriculum/week-1/session-1.ts";
import { week1Session2 } from "../src/content/curriculum/week-1/session-2.ts";
import { week1Session3 } from "../src/content/curriculum/week-1/session-3.ts";
import { toPublicSession } from "../src/content/curriculum/types.ts";
import { resolveGridAttempt } from "../src/lib/tasks/attempt.ts";
import { interpretUtterance } from "../src/lib/tasks/interpreter.ts";
import { sessionComplete } from "../src/lib/tasks/session.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const REPEATS = Number(process.env.GOOD_CHILD_REPEATS ?? 3);
const DELAY_MS = Number(process.env.GOOD_CHILD_DELAY_MS ?? 350);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadEnvFile(path) {
  if (!existsSync(path)) return false;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;
    if (process.env[match[1]]) continue;
    let v = match[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[match[1]] = v;
  }
  return true;
}

const envSources = [];
for (const p of [
  join("C:/Projects/mindshift/.env"),
  join(root, ".env"),
  join("C:/Projects/mindshift/.env.local"),
]) {
  if (loadEnvFile(p)) envSources.push(p);
}

const hasGemini = Boolean(process.env.GEMINI_API_KEY);
const hasAzure = Boolean(process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_API_KEY);

/** Precise Russian that should paint exactly the target (1-based speech). */
const GOOD = {
  // --- w1-s1 ---
  "w1s1-collision": "закрась весь верхний ряд",
  "w1s1-p1": "закрась весь левый столбец",
  "w1s1-p2": "закрась весь нижний ряд",
  "w1s1-p3": "закрась клетку строка 2 столбец 1 и строка 2 столбец 2",
  "w1s1-p4": "в верхнем ряду закрась первые три клетки слева",
  "w1s1-p5": "во втором ряду закрась две клетки справа",
  "w1s1-transfer": "закрась весь правый столбец",
  // --- w1-s2 ---
  "w1s2-collision":
    "закрась клетки строка 2 столбец 2, строка 2 столбец 3, строка 3 столбец 2, строка 3 столбец 3",
  "w1s2-p1": "во втором ряду закрась столбец 2 и столбец 3",
  "w1s2-p2": "во втором ряду закрась столбец 1 и столбец 3",
  "w1s2-p3":
    "закрась клетки строка 1 столбец 1, строка 1 столбец 2 и строка 2 столбец 1",
  "w1s2-p4":
    "закрась клетки строка 2 столбец 2, строка 2 столбец 3, строка 3 столбец 2, строка 3 столбец 3",
  "w1s2-p5": "в правом столбце закрась строку 2 и строку 3",
  "w1s2-transfer":
    "закрась клетки строка 1 столбец 1, строка 2 столбец 2, строка 3 столбец 3, строка 4 столбец 4",
  // --- w1-s3 ---
  "w1s3-collision":
    "закрась клетки строка 2 столбец 2, строка 2 столбец 3, строка 3 столбец 1, строка 3 столбец 2, строка 3 столбец 3, строка 3 столбец 4, строка 4 столбец 2, строка 4 столбец 3",
  "w1s3-p1": "в левом столбце закрась три клетки сверху",
  "w1s3-p2": "в третьем ряду закрась три клетки слева",
  "w1s3-p3": "закрась весь верхний ряд и весь нижний ряд",
  "w1s3-p4":
    "закрась клетки строка 1 столбец 1, строка 2 столбец 1, строка 3 столбец 1 и строка 3 столбец 2",
  "w1s3-p5":
    "закрась клетки строка 2 столбец 2, строка 2 столбец 3 и строка 3 столбец 2",
  "w1s3-transfer":
    "закрась весь верхний ряд и ещё клетки строка 2 столбец 2, строка 3 столбец 2, строка 4 столбец 2",
};

const FIGURE_LEAK_RE = /весь (левый|правый|верхний|нижний)/i;
const CELL_DUMP_RE = /\[\s*\d\s*,| \(\s*\d\s*,\s*\d\s*\)/;

const sessions = [week1Session1, week1Session2, week1Session3];

const contractFindings = [];
function contract(name, ok, detail = "") {
  contractFindings.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

console.log("\n=== pedagogy / API contracts ===");
for (const session of sessions) {
  const pub = toPublicSession(session);
  contract(
    `${session.id} toPublicSession strips hintRu`,
    pub.tasks.every((t) => !("hintRu" in t))
  );
  contract(
    `${session.id} hintAvailable true`,
    pub.tasks.every((t) => t.hintAvailable === true)
  );
  contract(
    `${session.id} hintRu scaffold not cell dump`,
    session.tasks.every(
      (t) =>
        t.hintRu.length > 20 &&
        !t.hintRu.includes("[0,") &&
        !CELL_DUMP_RE.test(t.hintRu.replace(/\s/g, ""))
    )
  );
  const practiceLeaks = session.tasks.filter(
    (t) => t.role === "practice" && FIGURE_LEAK_RE.test(t.promptRu)
  );
  contract(
    `${session.id} practice promptRu does not name exact edge figure`,
    practiceLeaks.length === 0,
    practiceLeaks.map((t) => t.id).join(",")
  );

  // Soft pedagogy: free prompts naming L/квадрат/диагональ as the answer figure
  const namedFigure = session.tasks.filter(
    (t) =>
      t.role === "practice" &&
      /(квадрат|диагонал|L-фигур|букв[аыу]|домик)/i.test(t.promptRu)
  );
  contract(
    `${session.id} practice promptRu does not name shape word`,
    namedFigure.length === 0,
    namedFigure.map((t) => t.id).join(",")
  );

  // Content bug check: practiceRequired vs available practice
  const practiceCount = session.tasks.filter((t) => t.role === "practice").length;
  contract(
    `${session.id} practice count ≥ practiceRequired`,
    practiceCount >= session.practiceRequired,
    practiceCount >= session.practiceRequired
      ? `${practiceCount} ≥ ${session.practiceRequired}`
      : `${practiceCount} < ${session.practiceRequired}`
  );
  contract(
    `${session.id} has transfer`,
    session.tasks.some((t) => t.role === "transfer")
  );

  // sessionComplete logic with this session's practiceRequired + transfer
  const practicePasses = session.tasks
    .filter((t) => t.role === "practice")
    .slice(0, session.practiceRequired)
    .map((t) => ({ id: t.id, role: "practice", pass: true, tier: t.tier }));
  const transfer = session.tasks.find((t) => t.role === "transfer");
  const def = {
    id: session.id,
    concept: session.concept,
    practiceRequired: session.practiceRequired,
    requireTransfer: true,
    minTier: session.minTier,
  };
  contract(
    `${session.id} sessionComplete false without transfer`,
    !sessionComplete(def, practicePasses)
  );
  contract(
    `${session.id} sessionComplete true with practice+transfer`,
    sessionComplete(def, [
      ...practicePasses,
      { id: transfer.id, role: "transfer", pass: true, tier: transfer.tier },
    ])
  );
  contract(
    `${session.id} sessionComplete false if one practice fails`,
    !sessionComplete(def, [
      ...practicePasses.map((r, i) => (i === 0 ? { ...r, pass: false } : r)),
      { id: transfer.id, role: "transfer", pass: true, tier: transfer.tier },
    ])
  );
}

const taskResults = []; // { sessionId, taskId, role, utterance, attempts: [{pass, feedback, reason, latencyMs, cells}], passCount, failCount }

if (!hasGemini && !hasAzure) {
  console.log("\n=== live good-child SKIPPED (no GEMINI/AZURE key) ===");
  console.log(`Env sources tried/loaded: ${envSources.join(" | ") || "(none)"}`);
} else {
  console.log(`\n=== good-child live (${REPEATS} repeats/task) ===`);
  console.log(`Provider keys: gemini=${hasGemini} azure=${hasAzure}`);
  console.log(`Env loaded from: ${envSources.join(" | ") || "(process already set)"}`);

  for (const session of sessions) {
    console.log(`\n-- ${session.id} --`);
    for (const task of session.tasks) {
      const utterance = GOOD[task.id];
      if (!utterance || !task.target) {
        taskResults.push({
          sessionId: session.id,
          taskId: task.id,
          role: task.role,
          utterance: utterance || null,
          attempts: [],
          passCount: 0,
          failCount: REPEATS,
          error: !utterance ? "missing GOOD script" : "missing target",
        });
        console.log(`  FAIL  ${task.id} — missing script/target`);
        continue;
      }

      const attempts = [];
      for (let i = 0; i < REPEATS; i++) {
        try {
          const interpreted = await interpretUtterance("grid-draw", utterance);
          if (interpreted.family !== "grid-draw") {
            attempts.push({
              pass: false,
              feedback: "wrong family",
              reason: "wrong_family",
              latencyMs: interpreted.latencyMs,
              cells: null,
              model: interpreted.model,
            });
          } else {
            const outcome = resolveGridAttempt(interpreted.program, task.target);
            attempts.push({
              pass: outcome.pass === true,
              feedback: String(outcome.feedback || "").slice(0, 120),
              reason: outcome.reasonCode || (outcome.pass ? "ok" : "mismatch"),
              latencyMs: interpreted.latencyMs,
              cells:
                interpreted.program.status === "ok"
                  ? interpreted.program.cells
                  : null,
              model: interpreted.model,
              programStatus: interpreted.program.status,
              missing: outcome.missingCells,
              extra: outcome.extraCells,
            });
          }
        } catch (e) {
          attempts.push({
            pass: false,
            feedback: String(e?.message || e).slice(0, 160),
            reason: "error",
            latencyMs: null,
            cells: null,
          });
        }
        if (i < REPEATS - 1) await sleep(DELAY_MS);
      }

      const passCount = attempts.filter((a) => a.pass).length;
      const failCount = attempts.length - passCount;
      taskResults.push({
        sessionId: session.id,
        taskId: task.id,
        role: task.role,
        utterance,
        target: task.target,
        attempts,
        passCount,
        failCount,
      });
      const status = failCount === 0 ? "PASS" : passCount === 0 ? "FAIL" : "FLAKE";
      console.log(
        `  ${status}  ${task.id}  ${passCount}/${attempts.length}` +
          (failCount
            ? ` — ${attempts.find((a) => !a.pass)?.reason}: ${attempts.find((a) => !a.pass)?.feedback?.slice(0, 60)}`
            : "")
      );
    }
  }
}

// Content intent vs target spot-checks (authoring bugs, no LLM)
const contentBugs = [];
function expectCells(taskId, target, note) {
  // just record for receipt — targets are ground truth; flag if prompt/hint contradict role
  void target;
  void note;
}
// Known soft content smell: w1s3-p4 hint names "L-фигура" (paid scaffold OK);
// w1s2-transfer hint names "Диагональ" (paid OK). Free prompt naming would be a bug.
for (const session of sessions) {
  for (const t of session.tasks) {
    if (t.role === "practice" && /L-фигур|диагонал|квадрат 2/i.test(t.promptRu)) {
      contentBugs.push({
        id: t.id,
        kind: "prompt_names_figure",
        detail: t.promptRu.slice(0, 80),
      });
    }
    if (CELL_DUMP_RE.test(t.hintRu.replace(/\s/g, "")) || t.hintRu.includes("[0,")) {
      contentBugs.push({
        id: t.id,
        kind: "hint_cell_coordinates",
        detail: t.hintRu.slice(0, 80),
      });
    }
  }
}

// Summarize
const totalAttempts = taskResults.reduce((s, t) => s + t.attempts.length, 0);
const totalFails = taskResults.reduce((s, t) => s + t.failCount, 0);
const meanFailures =
  taskResults.length === 0
    ? null
    : taskResults.reduce((s, t) => s + t.failCount / Math.max(REPEATS, 1), 0) /
      taskResults.length;

const cannotPass = taskResults.filter((t) => t.passCount === 0);
const flakes = taskResults.filter((t) => t.passCount > 0 && t.failCount > 0);
const alwaysPass = taskResults.filter((t) => t.failCount === 0 && t.attempts.length > 0);
const contractFails = contractFindings.filter((c) => !c.ok);

const now = new Date().toISOString();
const lines = [];
lines.push(`# Good-child Week 1 receipt`);
lines.push(``);
lines.push(`**Date:** ${now}`);
lines.push(`**Repo:** mindshift-academy`);
lines.push(`**Path:** interpretUtterance('grid-draw') → resolveGridAttempt(program, target)`);
lines.push(`**Repeats per task:** ${REPEATS}`);
lines.push(`**Env sources loaded:** ${envSources.map((p) => `\`${p}\``).join(", ") || "_none_"}`);
lines.push(
  `**Provider:** gemini=${hasGemini} azure=${hasAzure}${hasGemini || hasAzure ? "" : " (LIVE SKIPPED)"}`
);
lines.push(``);
lines.push(`## Verdict`);
lines.push(``);
if (!hasGemini && !hasAzure) {
  lines.push(`Live good-child **SKIPPED** — no GEMINI/AZURE key. Contracts only.`);
} else if (cannotPass.length === 0 && flakes.length === 0 && contractFails.length === 0) {
  lines.push(`**All good-child attempts passed. No contract failures.**`);
} else {
  lines.push(`**PROBLEMS FOUND** — see below.`);
}
lines.push(``);
lines.push(`- Contract checks: ${contractFindings.filter((c) => c.ok).length}/${contractFindings.length} pass`);
lines.push(
  `- Live tasks always-pass: ${alwaysPass.length}/${taskResults.length || "n/a"}`
);
lines.push(`- Flaky tasks: ${flakes.length}`);
lines.push(`- Never-pass tasks: ${cannotPass.length}`);
lines.push(
  `- Mean failures per task (of ${REPEATS}): ${meanFailures == null ? "n/a" : meanFailures.toFixed(3)}`
);
lines.push(`- Total attempt fails: ${totalFails}/${totalAttempts || 0}`);
lines.push(``);

lines.push(`## Per-task results`);
lines.push(``);
lines.push(`| Task | Role | Pass/Repeats | Status | Notes |`);
lines.push(`|------|------|--------------|--------|-------|`);
for (const t of taskResults) {
  const status =
    t.attempts.length === 0
      ? "NO_RUN"
      : t.failCount === 0
        ? "PASS"
        : t.passCount === 0
          ? "FAIL"
          : "FLAKE";
  const note =
    t.error ||
    (t.failCount
      ? t.attempts
          .filter((a) => !a.pass)
          .map((a) => `${a.reason}:${(a.feedback || "").slice(0, 40)}`)
          .join("; ")
      : "");
  lines.push(
    `| ${t.taskId} | ${t.role} | ${t.passCount}/${t.attempts.length || REPEATS} | ${status} | ${note.replace(/\|/g, "/")} |`
  );
}
if (taskResults.length === 0) {
  lines.push(`| _(no live runs)_ | | | | |`);
}
lines.push(``);

lines.push(`## Utterances used (good child)`);
lines.push(``);
for (const [id, u] of Object.entries(GOOD)) {
  lines.push(`- \`${id}\`: «${u}»`);
}
lines.push(``);

lines.push(`## Contract findings`);
lines.push(``);
for (const c of contractFindings) {
  lines.push(`- ${c.ok ? "PASS" : "**FAIL**"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}
lines.push(``);

lines.push(`## Content bugs / pedagogy smells`);
lines.push(``);
if (contentBugs.length === 0 && contractFails.filter((c) => c.name.includes("promptRu")).length === 0) {
  lines.push(`None detected by static checks (practice prompts do not name edge figures; hints lack cell dumps).`);
} else {
  for (const b of contentBugs) {
    lines.push(`- **${b.kind}** \`${b.id}\`: ${b.detail}`);
  }
  for (const c of contractFails) {
    if (c.name.includes("promptRu") || c.name.includes("hintRu") || c.name.includes("cell")) {
      lines.push(`- **contract** ${c.name}: ${c.detail || "fail"}`);
    }
  }
}
lines.push(``);
lines.push(`### Paid-hint figure words (allowed scaffold, noted for product risk)`);
lines.push(``);
for (const session of sessions) {
  for (const t of session.tasks) {
    if (/(квадрат|диагонал|L-фигур|букв)/i.test(t.hintRu)) {
      lines.push(`- \`${t.id}\` hintRu mentions shape word (paid): «${t.hintRu.slice(0, 90)}…»`);
    }
  }
}
lines.push(``);

lines.push(`## Tasks good-child cannot pass`);
lines.push(``);
if (!hasGemini && !hasAzure) {
  lines.push(`_Live skipped — unknown._`);
} else if (cannotPass.length === 0) {
  lines.push(`None — every task passed at least once (and all repeats if no flakes).`);
} else {
  for (const t of cannotPass) {
    const sample = t.attempts[0];
    lines.push(
      `- **\`${t.taskId}\`** utter «${t.utterance}» → ${sample?.reason}: ${sample?.feedback}`
    );
    if (sample?.cells) {
      lines.push(`  - interpreted cells: \`${JSON.stringify(sample.cells)}\``);
    }
    if (t.target) {
      lines.push(`  - target: \`${JSON.stringify(t.target)}\``);
    }
  }
}
lines.push(``);

lines.push(`## Flakes`);
lines.push(``);
if (flakes.length === 0) {
  lines.push(`None.`);
} else {
  for (const t of flakes) {
    lines.push(
      `- **\`${t.taskId}\`** ${t.passCount}/${t.attempts.length} — fail reasons: ${t.attempts
        .filter((a) => !a.pass)
        .map((a) => a.reason)
        .join(", ")}`
    );
  }
}
lines.push(``);

lines.push(`## Residual product risks`);
lines.push(``);
lines.push(`1. Interpreter still LLM — temperature 0 reduces but does not eliminate flake on long cell lists.`);
lines.push(`2. Paid hints that name shapes (квадрат / диагональ / L) teach vocabulary shortcuts; OK if crystal-gated, leak if UI ever shows free.`);
lines.push(`3. Good-child scripts use explicit 1-based cell lists for hard shapes — real kids will underspecify; sessionComplete still requires transfer.`);
lines.push(`4. Collision tasks are not required for sessionComplete — child can skip collision pedagogy.`);
lines.push(`5. No sequence-world tasks in Week 1 — family coverage is grid-only.`);
lines.push(``);

lines.push(`## Attempt detail (failures only)`);
lines.push(``);
for (const t of taskResults) {
  const fails = t.attempts.filter((a) => !a.pass);
  if (!fails.length) continue;
  lines.push(`### ${t.taskId}`);
  fails.forEach((a, i) => {
    lines.push(
      `- attempt: pass=false reason=${a.reason} latency=${a.latencyMs ?? "n/a"} model=${a.model || "?"} feedback=«${a.feedback}» cells=${a.cells ? JSON.stringify(a.cells) : "n/a"}`
    );
  });
  lines.push(``);
}

const outPath = join(root, "docs/superpowers/specs/2026-07-27-good-child-week1-receipt.md");
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`\nWrote ${outPath}`);

const liveProblem = cannotPass.length + flakes.length;
const hardFail = contractFails.length > 0 || cannotPass.length > 0;
process.exit(hardFail ? 1 : liveProblem > 0 ? 2 : 0);
