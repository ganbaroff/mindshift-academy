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

console.log(
  `\nVAULT: ${written.length} файлов в ${outDir}\n` +
    `  недель ${COURSE_WEEKS.length} · сессий ${curriculum.length} · задач ${totalTasks} · ` +
    `миров ${Object.keys(SEQUENCE_WORLDS).length + Object.keys(RULE_WORLDS).length}\n` +
    `  canvas: ${nodes.length} узлов, ${edges.length} связей\n`
);
