#!/usr/bin/env node
/**
 * The whole course, exported as an Obsidian vault: one note per week, session, task, world
 * and family, wikilinked, plus a JSON Canvas tree you can open and pan.
 *
 * WHY A GENERATOR AND NOT A DOCUMENT
 *
 * A hand-written course map is wrong within a week. This repo already carries the proof:
 * `docs/archive/planning-2026-06-07/` exists because eight root-level planning files
 * described a product that no longer existed, and one of them asserted "COPPA 0% in code"
 * while the code had already shipped it. Anything hand-maintained beside living data drifts.
 *
 * So this reads the SAME `loadCurriculum()` the app serves to children, the same world
 * definitions the engines execute, and the same validator the build runs. Rerun it and the
 * map cannot quietly disagree with the territory.
 *
 * WHY BOTH MARKDOWN AND CANVAS
 *
 * They answer different questions, and the tooling splits the same way. Markdown with
 * wikilinks feeds Obsidian's graph view and Markmap-style plugins, which regenerate from the
 * outline and stay cheap as the course grows. JSON Canvas (jsoncanvas.org — an open spec
 * Obsidian reads natively) gives the literal branch-from-the-root picture, but its layout is
 * absolute pixel coordinates, which is exactly why a hand-drawn canvas rots. Here the
 * coordinates are computed, so the picture is as fresh as the code.
 *
 * Prior art considered: TypeDoc documents the TYPES, and the value here is the 81 task
 * VALUES; Docusaurus/MkDocs render hand-written markdown rather than derive it, which is the
 * staleness this exists to kill; the Obsidian mindmap and canvas plugins are viewers, so this
 * targets their open formats instead of competing with them.
 *
 * The vault contains answer keys — target cells, expected actions, claim truth values. It is
 * a founder's instrument and is never served to a browser.
 */
import { createRequire } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const { loadCurriculum } = require(join(root, "src/content/curriculum/index.ts"));
const { validateSession, hasTaskBrief } = require(join(root, "src/content/curriculum/validate.ts"));
const { COURSE_WEEKS, weekMeta } = require(join(root, "src/lib/tasks/course-map.ts"));
const { SEQUENCE_WORLDS } = require(join(root, "src/lib/tasks/sequence-world.ts"));
const { RULE_WORLDS, normalizeRuleMap } = require(join(root, "src/lib/tasks/rule-runner.ts"));
const { GRID_SIZE } = require(join(root, "src/lib/tasks/grid-draw.ts"));
const {
  HINT_CRYSTAL_COST,
  TASK_PASS_CRYSTAL_REWARD,
  STARTER_CRYSTALS,
} = require(join(root, "src/content/curriculum/types.ts"));

const outDir = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : join(root, "curriculum-vault");

const FAMILY_RU = {
  "grid-draw": "Клетки — сказать картинку словами",
  "sequence-world": "Порядок — назвать шаги, которые монстр умеет",
  "rule-runner": "Правило — одно ЕСЛИ-ТО на все карты",
  "pattern-expand": "Образец — правило вместо списка",
  "claim-check": "Проверка — поймать уверенную ложь",
};

const ROLE_RU = {
  collision: "столкновение — показать, что старый способ не работает",
  practice: "практика — то же умение ещё раз, с другой стороны",
  prediction: "предсказание — сказать результат до прогона",
  transfer: "перенос — то же умение в мире, который не тренировали",
};

const written = [];

/** Frontmatter + body. Key order is fixed so a rerun produces a byte-identical file. */
function note(frontmatter, body) {
  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((v) => `  - ${JSON.stringify(v)}`).join("\n")}`;
      }
      return `${key}: ${typeof value === "string" ? JSON.stringify(value) : value}`;
    })
    .join("\n");
  return `---\n${yaml}\n---\n\n${body.trim()}\n`;
}

/** The answer key for one task, as markdown lines. Shared by the notes and the HTML tree. */
function answerBlock(task) {
  const answer = [];
  if (task.target) {
    answer.push(`## Ответ: поле ${GRID_SIZE}×${GRID_SIZE}`);
    const filled = new Set(task.target.map(([r, c]) => `${r},${c}`));
    answer.push("```");
    for (let r = 0; r < GRID_SIZE; r += 1) {
      answer.push(
        Array.from({ length: GRID_SIZE }, (_, c) => (filled.has(`${r},${c}`) ? "██" : "··")).join(" ")
      );
    }
    answer.push("```");
    answer.push(`Координаты (0-based): \`${JSON.stringify(task.target)}\``);
  }
  if (task.ruleMaps) {
    answer.push("## Ответ: карты правил");
    answer.push("| карта | ситуация | верные действия |");
    answer.push("|---|---|---|");
    for (const map of task.ruleMaps) {
      const s = normalizeRuleMap(map);
      answer.push(`| ${s.id} | ${JSON.stringify(s.signals)} | ${s.expect.join(" / ")} |`);
    }
  }
  if (task.patternExpected) {
    answer.push("## Ответ: ряд");
    answer.push(task.patternExpected.join(" → "));
    answer.push(`Членов развернуть: ${task.patternExpandCount ?? task.patternExpected.length}`);
  }
  if (task.claims) {
    answer.push("## Ответ: утверждения");
    answer.push("| утверждение | правда? |");
    answer.push("|---|---|");
    for (const claim of task.claims) {
      answer.push(`| ${claim.text} | ${claim.truth ? "да" : "**нет**"} |`);
    }
  }
  return answer;
}

function write(relative, contents) {
  const path = join(outDir, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents.replace(/\r\n/g, "\n"), "utf8");
  written.push(relative);
}

const curriculum = loadCurriculum();
rmSync(outDir, { recursive: true, force: true });

// ── root ────────────────────────────────────────────────────────────────────
const totalTasks = curriculum.reduce((n, s) => n + s.tasks.length, 0);
const briefed = curriculum.filter((s) => s.tasks.every(hasTaskBrief));
const mindmap = [
  "mindmap",
  "  root((Курс))",
  ...COURSE_WEEKS.flatMap((w) => [
    `    w${w.week}["Неделя ${w.week} · ${w.ideaRu}"]`,
    `      part${w.week}["${w.partGrownRu}"]`,
    ...curriculum
      .filter((s) => s.week === w.week)
      .map((s) => `      ${s.id.replace("-", "")}["${s.session}. ${s.titleRu}"]`),
  ]),
].join("\n");

write(
  "00 Курс.md",
  note(
    {
      тип: "курс",
      недель: COURSE_WEEKS.length,
      сессий: curriculum.length,
      задач: totalTasks,
      сессий_с_брифом: briefed.length,
      сгенерировано: "scripts/curriculum/export-vault.mjs",
    },
    `# Курс целиком

Пять недель, ${curriculum.length} сессий, ${totalTasks} задач. Каждая задача — отдельная заметка со
всеми настройками, включая ответы. Это инструмент основателя, в браузер он не уезжает.

Экономика: ${STARTER_CRYSTALS} кристаллов на старте, +${TASK_PASS_CRYSTAL_REWARD} за первое прохождение
задачи, −${HINT_CRYSTAL_COST} за подсказку. Поле клеток ${GRID_SIZE}×${GRID_SIZE}.

Бриф (цель / дано / готово-когда) заполнен в ${briefed.length} сессиях из ${curriculum.length}.

\`\`\`mermaid
${mindmap}
\`\`\`

## Недели
${COURSE_WEEKS.map((w) => `- [[Неделя ${w.week}]] · ${w.ideaRu} — ${w.partGrownRu}`).join("\n")}

## Семейства задач
${Object.keys(FAMILY_RU)
  .map((f) => `- [[Семейство ${f}]] — ${FAMILY_RU[f]}`)
  .join("\n")}

## Миры
${[...Object.keys(SEQUENCE_WORLDS), ...Object.keys(RULE_WORLDS)]
  .map((id) => `- [[Мир ${id}]]`)
  .join("\n")}

Дерево целиком: \`Курс.canvas\`.`
  )
);

// ── weeks ───────────────────────────────────────────────────────────────────
for (const week of COURSE_WEEKS) {
  const sessions = curriculum.filter((s) => s.week === week.week);
  const worlds = [...new Set(sessions.flatMap((s) => s.tasks.map((t) => t.worldId)).filter(Boolean))];
  write(
    `Недели/Неделя ${week.week}.md`,
    note(
      {
        тип: "неделя",
        неделя: week.week,
        идея: week.ideaRu,
        часть_монстра: week.part,
        задач: sessions.reduce((n, s) => n + s.tasks.length, 0),
      },
      `# Неделя ${week.week} · ${week.ideaRu}

Монстр в конце недели: **${week.partGrownRu}** (${week.partRu}). ${week.partMeaningRu}

Часть выдаётся только когда пройдены все три сессии — \`earnedMonsterParts\` считает по
завершённым неделям, отдельного счётчика нет.

## Сессии
${sessions.map((s) => `- [[${s.id}]] — ${s.titleRu}`).join("\n")}

## Что в неделе живёт
- семейства: ${[...new Set(sessions.flatMap((s) => s.tasks.map((t) => t.family)))]
  .map((f) => `[[Семейство ${f}]]`)
  .join(", ")}
- миры: ${worlds.map((w) => `[[Мир ${w}]]`).join(", ") || "— (семейство без миров)"}

Назад: [[00 Курс]]`
    )
  );
}

// ── sessions + tasks ────────────────────────────────────────────────────────
for (const session of curriculum) {
  const issues = validateSession(session);
  const meta = weekMeta(session.week);
  write(
    `Сессии/${session.id}.md`,
    note(
      {
        тип: "сессия",
        id: session.id,
        неделя: session.week,
        номер: session.session,
        концепт: session.concept,
        практик_нужно: session.practiceRequired,
        мин_уровень: session.minTier,
        нужен_collision: Boolean(session.requireCollision),
        нужен_prediction: Boolean(session.requirePrediction),
        бриф_везде: session.tasks.every(hasTaskBrief),
        ошибки_валидатора: issues.length,
      },
      `# ${session.id} · ${session.titleRu}

Неделя ${session.week} ([[Неделя ${session.week}]] · ${meta.ideaRu}), сессия ${session.session} из 3.

**Заблуждение, которое ломаем:** ${session.misconception}

**Объяснение ребёнку:** ${session.explanationRu}

**Вопрос за ужином:** ${session.dinnerQuestionRu}

## Когда сессия засчитана
Практик нужно ${session.practiceRequired}${session.requireCollision ? ", плюс пройденное столкновение" : ""}${
        session.requirePrediction ? ", плюс пройденное предсказание" : ""
      }, плюс перенос. Считает \`sessionComplete\`.

## Задачи
${session.tasks
  .map(
    (t, i) =>
      `${i + 1}. [[${t.id}]] — ${t.role}, ${t.family}${t.worldId ? `, мир ${t.worldId}` : ""}, уровень ${t.tier}`
  )
  .join("\n")}

${issues.length ? `## Валидатор ругается\n${issues.map((i) => `- ${i.message}`).join("\n")}` : "Валидатор доволен."}

Назад: [[Неделя ${session.week}]]`
    )
  );

  for (const task of session.tasks) {
    const answer = answerBlock(task);
    write(
      `Задачи/${task.id}.md`,
      note(
        {
          тип: "задача",
          id: task.id,
          сессия: session.id,
          неделя: session.week,
          роль: task.role,
          семейство: task.family,
          мир: task.worldId ?? null,
          уровень: task.tier,
          бриф: hasTaskBrief(task),
        },
        `# ${task.id}

[[${session.id}]] · [[Неделя ${session.week}]] · [[Семейство ${task.family}]]${
          task.worldId ? ` · [[Мир ${task.worldId}]]` : ""
        }

**Роль:** ${ROLE_RU[task.role] ?? task.role}
**Уровень:** ${task.tier} — рантайм может поднять или опустить по мастерству (\`effectiveTaskTier\`)

## Что видит ребёнок
${task.goalRu ? `**Цель:** ${task.goalRu}\n\n` : ""}${
          task.givenRu?.length ? `**Дано:** ${task.givenRu.join(" · ")}\n\n` : ""
        }${task.doneWhenRu ? `**Готово, когда:** ${task.doneWhenRu}\n\n` : ""}**Формулировка:** ${task.promptRu}
${task.doneWhenFullRu ? `\n**Полное условие, раскрывается после промаха:** ${task.doneWhenFullRu}\n` : ""}
## Подсказка — платная, ${HINT_CRYSTAL_COST} кристаллов
${task.hintRu}
${hasTaskBrief(task) ? "" : "\n> Бриф не заполнен: ребёнок видит только формулировку.\n"}
${answer.join("\n")}`
      )
    );
  }
}

// ── families ────────────────────────────────────────────────────────────────
for (const [family, description] of Object.entries(FAMILY_RU)) {
  const tasks = curriculum.flatMap((s) =>
    s.tasks.filter((t) => t.family === family).map((t) => ({ s, t }))
  );
  write(
    `Семейства/Семейство ${family}.md`,
    note(
      { тип: "семейство", семейство: family, задач: tasks.length },
      `# ${family}

${description}

Задач в курсе: **${tasks.length}**. Недели: ${[...new Set(tasks.map(({ s }) => s.week))].join(", ")}.

${tasks.map(({ s, t }) => `- [[${t.id}]] — ${s.id}, ${t.role}`).join("\n")}

Назад: [[00 Курс]]`
    )
  );
}

// ── worlds ──────────────────────────────────────────────────────────────────
for (const world of Object.values(SEQUENCE_WORLDS)) {
  const users = curriculum.flatMap((s) =>
    s.tasks.filter((t) => t.worldId === world.id).map((t) => t.id)
  );
  const rows = Object.entries(world.rules).map(([action, rule]) => {
    const needs = (rule.requires ?? [])
      .map(
        (r) =>
          `\`${r.key}\`${r.min !== undefined ? ` >= ${r.min}` : ""}${
            r.max !== undefined ? ` <= ${r.max}` : ""
          } иначе «${world.failureRu[r.failure]}»`
      )
      .join("; ");
    const effects = Object.entries(rule.effects)
      .map(([k, v]) => `\`${k}\` ${v > 0 ? "+" : ""}${v}`)
      .join(", ");
    return `| \`${action}\` | ${world.labelsRu[action]} | ${needs || "—"} | ${effects} |`;
  });
  write(
    `Миры/Мир ${world.id}.md`,
    note(
      {
        тип: "мир",
        движок: "sequence-world",
        id: world.id,
        действий: world.actions.length,
        задач: users.length,
      },
      `# Мир ${world.id}

${world.sceneRu}

**Успех:** счётчик \`${world.goalKey}\` дошёл до 1.

**Порядок объявления действий — рабочее решение** (инвариант, проверяется в
\`tests/tasks.test.mjs\`). Кнопки ребёнку показываются по алфавиту, чтобы порядок не был
подсказкой.

## Действия
| id | кнопка | требует | меняет |
|---|---|---|---|
${rows.join("\n")}

## Счётчики на старте
${Object.entries(world.initial).map(([k, v]) => `- \`${k}\` = ${v}`).join("\n")}

## Когда шаги кончились, а дела нет
${world.missingRu.map((m) => `- \`${m.key}\` < ${m.min} → «${m.textRu}»`).join("\n")}

**Успех вслух:** ${world.doneRu}

## Кто здесь живёт
${users.map((id) => `- [[${id}]]`).join("\n") || "— пока никто"}

Назад: [[00 Курс]]`
    )
  );
}

for (const world of Object.values(RULE_WORLDS)) {
  write(
    `Миры/Мир ${world.id}.md`,
    note(
      { тип: "мир", движок: "rule-runner", id: world.id, сигналов: world.signals.length },
      `# Мир ${world.id}

${world.sceneRu}

Если ни одно правило не подошло и ветки «иначе» нет — монстр делает \`${world.fallbackAction}\`.

## Что монстр видит
${world.signals
  .map((s) => `- \`${s.id}\` (${s.labelRu}): ${s.values.map((v) => `\`${v.id}\` — ${v.labelRu}`).join(", ")}`)
  .join("\n")}

## Что монстр умеет
${world.actions.map((a) => `- \`${a.id}\` — ${a.labelRu}`).join("\n")}

Верный ответ живёт в карте задачи (\`expect\`), не в движке. Старые карты
(\`{ahead, successWhen}\`) переводит шим \`normalizeRuleMap\`; он удаляется, когда последняя
старая карта переписана.

Назад: [[00 Курс]]`
    )
  );
}

// ── canvas ──────────────────────────────────────────────────────────────────
// Absolute pixel coordinates, computed. A hand-drawn canvas is what rots; this one is a
// function of the course, so it is as fresh as the code that produced it.
const nodes = [];
const edges = [];
const SIZE = { root: [260, 90], week: [260, 90], session: [300, 80], task: [340, 64] };
const COL = { root: 0, week: 460, session: 900, task: 1400 };
const GAP = 18;
const WEEK_COLOR = ["1", "2", "3", "4", "6"];

let cursor = 0;
const weekCentres = [];
for (const [weekIndex, week] of COURSE_WEEKS.entries()) {
  const sessions = curriculum.filter((s) => s.week === week.week);
  const sessionCentres = [];
  for (const session of sessions) {
    const top = cursor;
    for (const task of session.tasks) {
      nodes.push({
        id: `t-${task.id}`,
        type: "file",
        file: `Задачи/${task.id}.md`,
        x: COL.task,
        y: cursor,
        width: SIZE.task[0],
        height: SIZE.task[1],
        color: WEEK_COLOR[weekIndex],
      });
      cursor += SIZE.task[1] + GAP;
    }
    const centre = Math.round(top + (cursor - GAP - top) / 2 - SIZE.session[1] / 2);
    sessionCentres.push(centre);
    nodes.push({
      id: `s-${session.id}`,
      type: "file",
      file: `Сессии/${session.id}.md`,
      x: COL.session,
      y: centre,
      width: SIZE.session[0],
      height: SIZE.session[1],
      color: WEEK_COLOR[weekIndex],
    });
    for (const task of session.tasks) {
      edges.push({
        id: `e-${session.id}-${task.id}`,
        fromNode: `s-${session.id}`,
        fromSide: "right",
        toNode: `t-${task.id}`,
        toSide: "left",
      });
    }
    cursor += GAP * 2;
  }
  const weekCentre = Math.round((sessionCentres[0] + sessionCentres[sessionCentres.length - 1]) / 2);
  weekCentres.push(weekCentre);
  nodes.push({
    id: `w-${week.week}`,
    type: "file",
    file: `Недели/Неделя ${week.week}.md`,
    x: COL.week,
    y: weekCentre,
    width: SIZE.week[0],
    height: SIZE.week[1],
    color: WEEK_COLOR[weekIndex],
  });
  for (const session of sessions) {
    edges.push({
      id: `e-w${week.week}-${session.id}`,
      fromNode: `w-${week.week}`,
      fromSide: "right",
      toNode: `s-${session.id}`,
      toSide: "left",
    });
  }
}

nodes.push({
  id: "root",
  type: "file",
  file: "00 Курс.md",
  x: COL.root,
  y: Math.round((weekCentres[0] + weekCentres[weekCentres.length - 1]) / 2),
  width: SIZE.root[0],
  height: SIZE.root[1],
});
for (const week of COURSE_WEEKS) {
  edges.push({
    id: `e-root-w${week.week}`,
    fromNode: "root",
    fromSide: "right",
    toNode: `w-${week.week}`,
    toSide: "left",
    label: `${week.ideaRu} → ${week.partRu}`,
  });
}

write("Курс.canvas", `${JSON.stringify({ nodes, edges }, null, 2)}\n`);

// ── animated tree ───────────────────────────────────────────────────────────
// One self-contained file: no CDN, no build, no Obsidian. Double-click it and the whole
// course unfolds. Canvas needs Obsidian and does not animate; this opens on a phone.
//
// The expansion animates `grid-template-rows: 0fr → 1fr`, which is the only way to animate
// to a height nobody knows in advance without measuring in JS. Children stagger in behind
// it. Under prefers-reduced-motion everything still opens — instantly, because the point is
// seeing the course, not watching it move.
const model = COURSE_WEEKS.map((week) => ({
  week: week.week,
  ideaRu: week.ideaRu,
  partGrownRu: week.partGrownRu,
  partMeaningRu: week.partMeaningRu,
  sessions: curriculum
    .filter((s) => s.week === week.week)
    .map((session) => ({
      id: session.id,
      titleRu: session.titleRu,
      misconception: session.misconception,
      explanationRu: session.explanationRu,
      dinnerQuestionRu: session.dinnerQuestionRu,
      tasks: session.tasks.map((task) => ({
        id: task.id,
        role: task.role,
        roleRu: ROLE_RU[task.role] ?? task.role,
        family: task.family,
        worldId: task.worldId ?? null,
        tier: task.tier,
        goalRu: task.goalRu ?? null,
        givenRu: task.givenRu ?? null,
        doneWhenRu: task.doneWhenRu ?? null,
        promptRu: task.promptRu,
        hintRu: task.hintRu,
        answer: answerBlock(task).join("\n"),
      })),
    })),
}));

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const treeHtml = model
  .map(
    (week, wi) => `<details class="week" style="--i:${wi}" data-color="${wi}">
  <summary><span class="chev"></span><b>Неделя ${week.week}</b> · ${esc(week.ideaRu)}
    <span class="grow">${esc(week.partGrownRu)}</span></summary>
  <div class="wrap"><div class="inner">
    <p class="why">${esc(week.partMeaningRu)}</p>
    ${week.sessions
      .map(
        (session, si) => `<details class="session" style="--i:${si}">
      <summary><span class="chev"></span>${esc(session.id)} · ${esc(session.titleRu)}
        <span class="count">${session.tasks.length}</span></summary>
      <div class="wrap"><div class="inner">
        <p class="mis"><b>Ломаем:</b> ${esc(session.misconception)}</p>
        <p>${esc(session.explanationRu)}</p>
        <p class="dinner"><b>За ужином:</b> ${esc(session.dinnerQuestionRu)}</p>
        ${session.tasks
          .map(
            (task, ti) => `<details class="task ${task.role}" style="--i:${ti}">
          <summary><span class="chev"></span><code>${esc(task.id)}</code>
            <span class="tag">${esc(task.role)}</span>
            <span class="tag ghost">${esc(task.family)}${task.worldId ? " · " + esc(task.worldId) : ""}</span>
            <span class="tag ghost">tier ${task.tier}</span></summary>
          <div class="wrap"><div class="inner">
            <p class="role">${esc(task.roleRu)}</p>
            ${task.goalRu ? `<p><b>Цель:</b> ${esc(task.goalRu)}</p>` : ""}
            ${task.givenRu ? `<p><b>Дано:</b> ${esc(task.givenRu.join(" · "))}</p>` : ""}
            ${task.doneWhenRu ? `<p><b>Готово, когда:</b> ${esc(task.doneWhenRu)}</p>` : ""}
            <p><b>Формулировка:</b> ${esc(task.promptRu)}</p>
            <p class="hint"><b>Подсказка (${HINT_CRYSTAL_COST}💎):</b> ${esc(task.hintRu)}</p>
            ${task.answer ? `<pre class="answer">${esc(task.answer)}</pre>` : ""}
          </div></div>
        </details>`
          )
          .join("\n")}
      </div></div>
    </details>`
      )
      .join("\n")}
  </div></div>
</details>`
  )
  .join("\n");

write(
  "Курс.html",
  `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Курс целиком — ${curriculum.length} сессий, ${totalTasks} задач</title>
<style>
:root{
  --paper:#FBF1E0;--surface:#FFFDF8;--ink:#2B2320;--muted:rgba(43,35,32,.55);
  --line:rgba(43,35,32,.14);--ease:cubic-bezier(.23,1,.32,1);
  --c0:#FF6B4A;--c1:#1FA398;--c2:#8B6BFF;--c3:#3FB37F;--c4:#E0A700;
}
*{box-sizing:border-box}
body{margin:0;padding:24px 16px 80px;background:var(--paper);color:var(--ink);
  font:16px/1.5 ui-rounded,"Nunito",system-ui,sans-serif}
header{max-width:820px;margin:0 auto 20px}
h1{font-size:26px;margin:0 0 4px}
.sub{color:var(--muted);font-size:14px;margin:0}
main{max-width:820px;margin:0 auto}
button{font:inherit;border:1px solid var(--line);background:var(--surface);color:var(--ink);
  border-radius:999px;padding:8px 16px;min-height:44px;cursor:pointer;
  transition:transform 160ms var(--ease)}
button:active{transform:scale(.97)}
details{border-radius:16px;margin:8px 0;background:var(--surface);border:1px solid var(--line);
  animation:rise 320ms var(--ease) both;animation-delay:calc(var(--i,0) * 45ms)}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
summary{list-style:none;cursor:pointer;padding:12px 14px;display:flex;gap:8px;align-items:center;
  flex-wrap:wrap;min-height:44px;border-radius:16px}
summary::-webkit-details-marker{display:none}
summary:hover{background:rgba(43,35,32,.03)}
.chev{width:8px;height:8px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);
  transform:rotate(-45deg);transition:transform 220ms var(--ease);flex:none;margin-right:2px}
details[open]>summary .chev{transform:rotate(45deg)}
/* 0fr → 1fr is the only way to animate to a height nobody measured. */
.wrap{display:grid;grid-template-rows:0fr;transition:grid-template-rows 320ms var(--ease)}
details[open]>.wrap{grid-template-rows:1fr}
.inner{overflow:hidden;padding:0 14px}
details[open]>.wrap>.inner{padding-bottom:12px}
.week{border-left:4px solid var(--c0)}
.week[data-color="1"]{border-left-color:var(--c1)}
.week[data-color="2"]{border-left-color:var(--c2)}
.week[data-color="3"]{border-left-color:var(--c3)}
.week[data-color="4"]{border-left-color:var(--c4)}
.session{background:rgba(255,255,255,.6)}
.task{background:var(--paper)}
.task.transfer{outline:1px dashed var(--c2)}
.grow,.count,.tag{font-size:12px;font-weight:700;color:var(--muted);
  background:rgba(43,35,32,.06);border-radius:999px;padding:3px 9px}
.grow{margin-left:auto}
.tag.ghost{background:none;border:1px solid var(--line)}
code{font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
p{margin:8px 0}
.why,.role,.mis,.dinner,.hint{color:var(--muted);font-size:14px}
.answer{background:rgba(43,35,32,.05);border-radius:12px;padding:10px 12px;overflow-x:auto;
  font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}
@media (prefers-reduced-motion:reduce){
  details{animation:none}
  .wrap{transition:none}
  .chev{transition:none}
}
</style></head>
<body>
<header>
  <h1>Курс целиком</h1>
  <p class="sub">${COURSE_WEEKS.length} недели · ${curriculum.length} сессий · ${totalTasks} задач · сгенерировано из кода, не написано руками</p>
  <p><button id="all">Развернуть всё</button></p>
</header>
<main id="tree">
${treeHtml}
</main>
<script>
const all = document.getElementById("all");
let open = false;
all.addEventListener("click", () => {
  open = !open;
  // Staggered so a hundred panels do not slam open at once.
  document.querySelectorAll("details").forEach((d, i) => {
    setTimeout(() => { d.open = open; }, open ? Math.min(i * 8, 400) : 0);
  });
  all.textContent = open ? "Свернуть всё" : "Развернуть всё";
});
</script>
</body></html>
`
);

console.log(
  `\nVAULT: ${written.length} файлов в ${outDir}\n` +
    `  недель ${COURSE_WEEKS.length} · сессий ${curriculum.length} · задач ${totalTasks} · ` +
    `миров ${Object.keys(SEQUENCE_WORLDS).length + Object.keys(RULE_WORLDS).length}\n` +
    `  canvas: ${nodes.length} узлов, ${edges.length} связей\n`
);
