# Curriculum — what it is, what was wrong with it, what is still wrong

Written 2026-08-11, from a full inventory of all 81 tasks (`loadCurriculum()`), not from
planning docs. Read this before touching `src/content/curriculum/`.

## The critique, with counts

The course is 15 sessions × 5–7 tasks = **81 tasks across 5 families**. Measured:

| Problem | Evidence |
|---|---|
| **One world per week, repeated to exhaustion** | Week 2 was 15 tasks, all `sequence-world`, and every one of them was the same sandwich. Week 1 is 21 `grid-draw` tasks, six of which open with the identical sentence «Сделай так, чтобы совпало с картинкой». Weeks 3 and 4 are 15 each of one family. |
| **The engine made variety impossible** | `sequence-world.ts` hardcoded the six sandwich actions, one state machine and one failure vocabulary. No amount of authoring could have produced a second procedure. This was the root cause, not the content. |
| **"Transfer" tasks did not transfer** | Every session ends in one `transfer` task whose job is a NEW context. Week 1's was «Новая картинка» — same grid. Week 2's was «Утро монстра: назови шаги сэндвича» — the same sandwich again. A transfer inside the practised world is a fifth practice task wearing a different name. |
| **The buttons spelled the answer** | `SequenceSurface` rendered the action list in solution order, so week 2 could be passed by clicking top to bottom without reading anything. |
| **The answer key shipped to the browser** | The same surface imported the server world module, so the whole state machine — every precondition, i.e. the only valid order — was in the client bundle. |
| **12 of 15 sessions have no task brief** | `goalRu` / `givenRu` / `doneWhenRu` (08-UX-MONSTER-JOURNEY §2) exist in the type and render in the workspace. Only w1-s1 and week 2 carry them. |
| **Nothing connects a task to the monster** | The map promises точность → порядок → правило → образец → перенос and a part grown per week. No task ever says why it is being asked. |

## Fixed (this change)

**A sequence world is now data.** `SequenceWorld` = vocabulary + counter bag + per-action
requirements and effects. Deterministic, integer comparisons only, no expressions in content.
The safety properties are unchanged: the vocabulary is still a whitelist, so model output can
never reach a child as free text.

Three worlds ship: `sandwich`, `plant` (a forgotten step stays invisible until the end),
`leaving` (order forced by consequence, not by physics).

Week 2 rewritten around them, one world per session, and **every session's transfer task
lands in a world that session did not practise** — s1 ends on the windowsill, s2 in the
hallway, s3 back at the kitchen table.

Split `sequence-worlds-public.ts` (scene, vocabulary, labels — safe for the browser) from
`sequence-world.ts` (requirements and effects — the answer key, server only). Buttons now
render sorted by label.

### Invariants the tests hold

- `world.actions` in declared order is a valid solution — every world, asserted in
  `tests/tasks.test.mjs`. Content, tests and the browser harness all rely on it.
- Displayed button order is never the solution order.
- Every action has a rule, every rule an action, every counter an initial value, every
  reachable failure code a Russian sentence.
- One world's plan is refused in another (vocabulary isolation).
- Week 2's three sessions do not share a collision world, and no transfer stays home.
- `validateSession` now REQUIRES `worldId` on every `sequence-world` task, and rejects an
  unknown one. Forgetting it fails the build instead of silently serving the sandwich.

## Still wrong — not done

1. **Weeks 1, 3, 5 are still one world each.** Weeks 2 and 4 have been reworked. Week 1's
   21 grid tasks and their six repeated prompts are untouched.
2. **Their transfer tasks still do not transfer.** Same defect as week 2 had, in three places.
3. **9 sessions still have no brief.** w1-s2, w1-s3, and all of weeks 3 and 5. `validateSession`
   is all-or-nothing per session, so they can be migrated one session at a time safely.
4. **No task references the monster's growth.** The week's idea and the part it earns are on
   the map and nowhere else.
5. **`grid-draw`, `rule-runner`, `pattern-expand`, `claim-check` are already data-driven** —
   targets, maps, patterns and claims live in content. Those four need authoring, not
   engineering. `sequence-world` was the only family that needed the engine opened up.

---

# The plan for weeks 1, 3, 4, 5

## The rule the old course broke

A task varies along three axes: the **world** (what the monster is doing), the **thinking**
(what the child has to decide), and the **tier** (how much help is withdrawn). The old course
varied only the tier. Week 2's sandwich was the loudest case, but week 1 repeats one sentence
six times for the same reason.

So, for every week from here:

- **The world changes between sessions.** Not a reskin — a different situation with different
  consequences. Week 2's plant world exists because a forgotten step there is invisible until
  the end, which the kitchen cannot teach.
- **The thinking escalates inside a session.** Collision → practice → transfer must each ask
  for something the previous one did not.
- **The transfer task always leaves the world it practised.** This is now enforced for week 2
  and will be enforced for all five.
- **A prompt names the finished thing.** «Сделай так, чтобы совпало» names nothing. «Собери
  лестницу из трёх ступенек» does.

## What each week becomes

**Week 1 · точность · `grid-draw` · 4×4 grid (`GRID_SIZE = 4`), 21 tasks today.**
Sixteen cells cannot carry twenty-one distinct tasks, which is why six of them open with the
same sentence. Cut to 5–6 per session (matching every other week), and give each session a
picture world that says what is being built: s1 rooms of a house (solid blocks, easy to
describe), s2 letters and signs (scattered cells — hard to describe without «кроме»), s3 a
path across the grid (order and adjacency matter). Precision is the skill, so difficulty comes
from how hard the picture is to SAY, not from how many cells it has.

**Week 3 · правило · `rule-runner`, 15 tasks.**
The corridor is hardcoded the way the sandwich was: conditions are one tile ahead
(`open|wall|trap|goal`), actions are five verbs. **Decision point, not an agent's call:**
either (a) content-only — rename the situation per session (робот в коридоре → поливальная
машина, где ловушка это клумба → курьер на четырёх дорогах) and carry the variety in the maps,
or (b) open the engine as week 2's was, adding a second condition kind (fuel, cargo, time) so
the rule itself gets harder. (a) is one day and risks being a costume; (b) is three days and
is the honest fix. Default if nobody chooses: (a) plus more maps, including hidden ones, and
say plainly in the PR that it is a reskin.

**Week 4 · образец · `pattern-expand`, 15 tasks.**
`PatternRule` is `arithmetic{start,step}` or `cycle{items}` — content is entirely free. Nothing
blocks variety here; it was simply never written. Numbers, colours, days of the week, dance
steps, drum beats. Lowest risk, so it goes first as the pattern-setter for the rest.

**Week 5 · перенос · `claim-check` + `rule-runner`, 15 tasks.**
Claims are free text with truth labels — fully authorable. The capstone should pull its claims
from the four worlds the child has actually been in (sandwich, plant, leaving, and week 1's
pictures), which is what makes it a capstone rather than a sixth week.

## Order of work, and why this order

1. ~~**The invariant test first, red.**~~ **СДЕЛАНО 2026-08-14.** `tests/curriculum-variety.test.mjs`
   существует и красный ровно там, где предсказано. Замер прогона (`npm run test:variety`, exit 1):
   **14 нарушений в неделях 1, 3, 4, 5; неделя 2 зелёная.** Неделя 1 — 21 задача, 6 открываются
   фразой «Сделай так, чтобы совпало с картинкой», ещё 9 — «Сделай так, чтобы совпало», две пары
   задач совпадают дословно; без брифа 14 из 21. Недели 3, 4, 5 — по 15 задач, ни одна не объявляет
   мир, ни одна не имеет брифа. Итого без брифа 59 из 81 — цифра из раздела «Возраст» подтверждена
   независимым прогоном, а не переписана.

   Проверки: (1) мир объявлен; (2) неделя не проходит целиком в одном мире; (3) перенос уходит из
   мира, который сессия отрабатывала; (4) ни одна фраза не открывает две задачи внутри недели;
   (5) у каждой задачи есть бриф. Проверки 2 и 3 не выполняются, пока мир не объявлен, и так и
   пишутся в отчёте — «не измерено» вместо ложного PASS.

   Мир стал объявляемым полем. `worldId` остался ключом sequence-движка; для остальных четырёх
   семейств добавлено `world?: string` в `ContentTask` — чисто декларативная метка, её никто не
   резолвит, поэтому она не может выбрать чужую машину состояний.

   Два режима, чтобы красный тест не блокировал всю сборку: `npm run test:variety` — полный
   инвентарь долга, exit 1; `--ratchet` (внутри `npm test`) — сторожит недели из `GREEN_WEEKS`
   и падает, если неделя, числящаяся красной, уже стала чистой. Обе стороны храповика проверены
   подделкой списка: `GREEN_WEEKS=[2,4]` → exit 1 (регресс), `GREEN_WEEKS=[]` → exit 1 (неделя 2
   чистая, но не зарегистрирована).

   Каждая следующая неделя добавляет свой номер в `GREEN_WEEKS` тем же PR, что её чинит.
2. ~~**Week 4**~~ **СДЕЛАНО 2026-08-14.** Три мира вместо абстрактных чисел: `drum` (барабан,
   круг возвращается), `beads` (нитка бусин, старт и шаг), `week-days` (расписание монстра,
   починка сбоя и далёкий член). Решение меняется вместе с миром, а не только декорация:
   цикл → арифметика → починка и выход за десятый день. Переносы по кольцу, как в неделе 2:
   s1 кончает в бусах, s2 в днях, s3 возвращается в барабан — но уже с задачей починки,
   которой барабан не ставил. Все 15 задач получили бриф, id ни одной не тронут.

   Долг по инварианту: **14 → 12 нарушений**, зелёных недель **1 → 2**. Храповик отработал
   на первом же настоящем применении: неделя 4 стала чистой, и он потребовал внести её в
   `GREEN_WEEKS` в этом же PR, иначе прогон падал.
3. **Week 1** — the trim is the risky part (see below), so it goes second while attention is high.
4. **Week 5** — depends on 1 and 4 existing, because its claims quote them.
5. **Week 3** — last, because it is the one that may need an engineering decision.
6. **Sweep** — briefs everywhere, and every session's `explanationRu` naming the part the
   monster grows that week. Right now nothing in a task ever mentions the monster.

**One PR per week.** The content is Russian prose aimed at eight-year-olds; the founder should
be able to read one week and reject it without unpicking five.

## Risks, named before they bite

- **Cutting week 1 from 21 tasks to ~16 changes the economy.** 3 crystals per first pass and
  hints cost 5. Fewer tasks means fewer crystals before the first hint a child wants. Check
  `STARTER_CRYSTALS`/`TASK_PASS_CRYSTAL_REWARD` against the new count, in the same PR.
- **The browser gate asserts 81 tasks.** It is a coverage receipt, not a constant to protect —
  update it in the same commit that changes the count, never separately.
- **`practiceRequired`, `minTier`, `requireCollision`, `requirePrediction`** are per session and
  are what `sessionComplete` uses. Changing task counts without them is how a session becomes
  impossible to finish.
- **Deleting tasks orphans progress.** `TaskAttempt` rows reference `taskId`. A child mid-pilot
  who passed `w1s1-p5` keeps a row pointing at a task that no longer exists;
  `isCurriculumSessionComplete` recomputes from the CURRENT task list, so their session can
  silently un-complete. Either keep ids stable and only rewrite text, or accept the reset and
  say so. **Default: keep every task id that survives, and never renumber.**
- **Reskinning is not variety.** If a session's story changes but the child's decision does
  not, the PR must say so in those words rather than claim a rework.

---

# Возраст: ответ на вопрос CEO (добавлено 2026-08-13)

Вопрос был: «не верю, что курс рассчитан на 8–14». Проверено измерением всех 81 задачи и
кода, который их подаёт. Ответ короткий: **вопрос задан к цифре, которую канон уже отменил, а
настоящий дефект не в возрасте, а в том, что курс не даёт ребёнку говорить.**

## 1. В репозитории два разных возраста, и они противоречат

| Что написано | Где |
|---|---|
| «Ядро когорты V1 — дети **8–11** лет (решение CEO)» и «**Возраст 12–14. НЕ часть UX версии V1**» | `docs/canon/MINDSHIFT-PRODUCT-CANON-V1.md:7,9` — канон, приоритет над всем остальным |
| «дети **8–14**» | `README.md:3`, `AGENTS.md:5`, `docs/architecture/01-BUSINESS-AND-LEGAL.md:4`, `docs/architecture/08-UX-MONSTER-JOURNEY.md:167`, `docs/design-handoff/v1.1/01-BRIEF.md:5`, `docs/superpowers/specs/2026-07-27-thinking-curriculum-design.md:39`, `docs/FOUNDER-REQUIREMENTS-RECORD.md:57` |

Канон от 31.07 сам объясняет расхождение: «сложность и тон рассчитаны на измеримое мастерство
8–11, а не на заявленный возраст; вопрос про 12–14 решат данные пилота» (§11.1). То есть курс
писался под 8–11 сознательно. Шесть документов этого не знают и продолжают обещать 8–14.

**Первое действие — не трогать курс, а привести доки к канону.** Пока `README.md` обещает 8–14,
любой следующий агент будет чинить курс под цифру, которой нет.

## 2. Что измерено на 81 задаче

Инвентарь: длина `promptRu`, число шагов в ответе, наличие брифа, тип ввода.

- **Длина формулировок — не проблема.** Диапазон `promptRu` — от 6 слов (`w4s2-p2`) до 17
  (`w5s3-act1-prediction`), при 2–3 предложениях на задачу. Предложение выходит по 5–8 слов —
  это ниже любого порога читабельности для второго класса. Гипотезу «текст слишком длинный для
  восьмилетки» проверил и **отклоняю**.
- **Зато одна и та же фраза 15 раз.** `«Сделай так, чтобы совпало»` встречается ровно 15 раз,
  все в неделе 1, по 5 на каждую сессию (`grep -rc` по `src/content/curriculum/week-1/`). Это
  21 задача, из которых 15 открываются одинаково.
- **Брифа нет у 59 задач из 81.** `goalRu` встречается: неделя 1 — 7 раз (только сессия 1),
  неделя 2 — 15 (все), недели 3, 4, 5 — **0**.
- **Основной путь ребёнка — клики, письмо спрятано и названо необязательным.**
  ~~«Ни в одной из 81 задач ребёнок не пишет ни слова»~~ — **это утверждение было неверным,
  исправлено 2026-08-13.** Оно опиралось на grep по `src/components/curriculum` (там
  действительно ноль полей ввода: `GridDrawSurface` — клики по клеткам, `RuleSurface` —
  выпадающие списки, `SequenceSurface` — кнопки, `ClaimSurface` и `PatternSurface` — выбор),
  но поле ввода живёт этажом выше — `src/app/session/[id]/page.tsx:913`, `#task-utterance`,
  внутри свёрнутой панели «Сказать своими словами» (`:904`). Найдено на скриншоте Playwright,
  а не грепом — вот цена узкого грепа.

  Что остаётся верным после проверки: поле **свёрнуто по умолчанию** и подписано
  «Это дополнительный способ. Основное задание можно выполнить в понятном поле выше»
  (`:907`). То есть письмо в курсе есть, но оно объявлено запасным вариантом, а основным
  назначен клик. Вывод §4 («сложность речи — та ось, по которой 8 и 14 расходятся сами»)
  от этого не меняется, но формулировка задачи меняется: надо не добавлять поле, а
  разворачивать и повышать в статусе существующее.

## 3. Что провалится у восьмилетки, что скучно четырнадцатилетнему

Кривая сложности — не наклон, а **ступенька, и она ровно на границе недели 2 → недели 3**.

**Восьмилетка ломается здесь:**

- `w3s3-collision` — «Одно правило на четыре карты — одна скрыта». Ребёнок должен держать в
  голове четыре состояния карты плюс правило, при том что брифа (`goalRu`/`givenRu`/`doneWhenRu`)
  у задачи нет. Классная работа Alloway & Gathercole даёт восьмилетке ~3 удерживаемые
  инструкции ([researchgate](https://www.researchgate.net/publication/254392644_Working_memory_and_classroom_learning)),
  прямой отсчёт цифр в 8 лет — 5–6 ([WISC-R нормы](https://www.nlsinfo.org/sites/default/files/attachments/121129/2008digitTables.html)).
  Четыре карты + скрытая пятая + правило — за порогом.
- `w5s3-act1-prediction` — самая длинная формулировка курса (17 слов), тир 2, требует
  предсказать результат правила ДО прогона, брифа нет. Предсказание без обратной связи — это
  ровно то, что CSTA относит к уровню 2, то есть 6–8 классы, 11–14 лет
  ([CSTA](https://csteachers.org/k12standards/)).
- Словарь недель 3–5 без объяснения: «условное правило» (`w5s3-act1`), «дефект» (`w5s3-act3`),
  «закономерность» (`w5s1-transfer`). Все три — в сессиях, где `goalRu` = 0.

**Четырнадцатилетнему скучно здесь:**

- `w1s1-p3` — «Выбери две клетки». Два клика. Вся неделя 1 — визуальное сличение двух картинок
  4×4, речь не участвует.
- `w4s2-p2` — «Старт 0, шаг 3 — десять членов». Устный счёт для второго класса.
- **Потолка нет вообще.** `tier` меняет ровно одну вещь: на первом уровне печатается строка
  «Коротко: …» ([`TaskWorkspace.tsx:123`](../src/components/curriculum/task-surfaces/TaskWorkspace.tsx)).
  Само задание на тирах 1, 2 и 3 идентично. Это не потолок, это снятая подсказка.
- **И до этой снятой подсказки ещё надо дойти.** `ConceptMastery.mastery` стартует с 0
  (`prisma/schema.prisma:138`), тир 2 включается на 0.35, тир 3 — на 0.7, шаг за верный ответ
  +0.08 на тире 1 и +0.12 на тире 2 (`src/lib/tasks/mastery.ts:9`). Четырнадцатилетний,
  решающий всё с первого раза, доходит до тира 3 только к восьмой задаче — то есть всю первую
  сессию и половину второй он смотрит на подсказку для восьмилетки.

## 4. Решение по возрасту

**Возраст не спрашиваем — вариант (а).** Обоснование, а не вкус:

1. Канон уже вывел 12–14 из V1. Спрашивать возраст, чтобы ветвить контент на группу, которой в
   версии нет, — работа впустую.
2. Возраст ребёнка — персональные данные. ICO Children's Code требует собирать «minimum amount
   of personal data needed to deliver element of service» и high privacy by default
   ([ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/)).
   Поля возраста в схеме нет вообще — ни `age`, ни `birthDate` в `prisma/schema.prisma`, ни
   вопроса в `src/app/onboarding/page.tsx`, ни в `src/lib/consent.ts`. Это сегодня плюс, а не
   пробел; терять его ради ветвления контента — плохой размен.
3. Канон уже выбрал принцип: «сложность подстраивается под ИЗМЕРЕННОЕ МАСТЕРСТВО, а не
   заявленный возраст». Механизм существует (`ConceptMastery` → `tierForMastery`). Он просто
   ничего не делает — см. §3.

**Вариант (в), ползунок родителю, — отклоняю.** Канон обещает родителю «только асинхронную
видимость», ползунок делает его настройщиком сложности и добавляет экран, который надо
поддерживать. Дешевле починить автоматику, чем выдать ручку от сломанной.

**Что делаем вместо сбора возраста:**

- **Тир должен менять задачу, а не подсказку. СДЕЛАНО 2026-08-13** — см. раздел «Тир меняет
  задачу» ниже. Тир 1 — образец раскрыт; тир 2 — образец свёрнут, напоминание убрано; тир 3 —
  образца нет вовсе плюс требование экономии, которое проверяет сервер. Это
  `low floor / high ceiling` по Resnick: один и тот же предмет, разные пути наверх
  ([Designing for Wide Walls](https://mres.medium.com/designing-for-wide-walls-323bdb4e7277)).
- **Первые три задачи — калибровка, а не обучение.** Восемь задач до тира 3 — это вся первая
  сессия старшего ребёнка, потраченная зря. Либо стартовая mastery поднимается по результату
  первых трёх ответов, либо шаг `PASS_DELTA` растёт при серии без ошибок.
- **Ребёнок должен начать писать.** Пока `<input>` в курсе ноль, спор про 8 или 14 бессмысленен:
  сложность речи и есть та ось, по которой восьмилетка и четырнадцатилетний расходятся
  естественно, без вопроса о возрасте. Восьмилетка скажет «положи хлеб», четырнадцатилетний —
  «положи хлеб, потом сыр, но нож возьми до всего». Это одна задача и два разных потолка.

## 5. Порядок работ, дополняющий план выше

Вставляется перед пунктом 1 старого плана («инвариантный тест»):

0. **Доки к канону.** `README.md`, `AGENTS.md`, `01-BUSINESS-AND-LEGAL.md`,
   `08-UX-MONSTER-JOURNEY.md`, `01-BRIEF.md`, спека курса: 8–14 → 8–11, со ссылкой на
   канон §11.1. Одна строка в каждом файле, один PR, риска ноль.
1'. **Инвариантный тест из старого плана дополняется двумя проверками:** ни одно предложение
   `promptRu` не повторяется внутри недели (сегодня падает на 15 повторах недели 1); каждая
   сессия несёт бриф (сегодня падает на 59 задачах).
2'. **Тир меняет задачу.** Отдельный PR до авторской работы над неделями — иначе неделя 4
   будет написана под тир, который ничего не значит.

## 6. Ограничения этого исследования

- Внешние источники собраны субагентами. Первичные проверены по URL: Resnick (Medium, его
  собственный текст), CSTA (csteachers.org), ISTE, code.org, ICO, WISC-R нормы. Часть фактов по
  Bebras и по СанПиН пришла из вторичных пересказов — как основание для решения не
  использовалась.
- **Русских числовых норм читабельности для младших школьников найти не удалось.** Формула
  Оборневой (`FRE = 206.835 − 1.52·ASL − 65.14·ASW`) существует, порогов «не больше N слов в
  предложении для 2 класса» в доступных источниках нет. Поэтому вывод §2 опирается на прямое
  измерение длины, а не на индекс.
- Живьём курс на ребёнке не проверялся. Всё выше — измерение файлов и кода.

---

# Тир меняет задачу (сделано 2026-08-13)

Первый пункт §4 закрыт. До этого `tier` менял одну строку копирайта, поэтому «уровень 3» был
снятой подсказкой, а не потолком. Теперь у уровня две половины — экранная и серверная.

## Экран: что убирается

| Уровень | Разобранный пример | Напоминание «Коротко» | Требование уровня |
|---|---|---|---|
| 1 | раскрыт | есть | нет |
| 2 | свёрнут (доступен, если попросить) | нет | нет |
| 3 | не отрисован вовсе | нет | есть, для `sequence-world` |

Реализовано в `src/components/curriculum/task-surfaces/TaskWorkspace.tsx`
(`WORKED_EXAMPLE_BY_TIER`). Задание, поле и `doneWhenRu` не двигаются: 08-UX-MONSTER-JOURNEY
§10.2 зафиксировал условие успеха как всегда видимое, а прятать цель — это не «сложнее», это
нечестно.

## Сервер: чего требует уровень 3

`src/lib/tasks/tier-demand.ts`. На уровне 3 план в `sequence-world` должен быть экономным:
без повторов и не длиннее объявленного мира. Правило детерминированное, копирайт закрытый,
и оно **может только отменить проход, никогда не выдать его** — вызывается в `finalizeAttempt`
после того, как посчитан тир, и до записи попытки, кристаллов и завершения сессии.

Это не театр, и вот доказательство: `checkSequence` сегодня проверяет только
`failure === null && goal > 0`, без границы на число шагов, а у каждого мира терминальное
действие не имеет self-cap — значит план с повтором последнего шага проходит. Этот факт
проверяется прямо на движке в `tests/tier-demand.test.mjs`; если кто-то однажды ограничит
длину внутри `checkSequence`, тест скажет об этом, а не согласится молча.

**Чего в этом изменении нет, названо прямо:** у `rule-runner` тот же зазор (ребёнок может
перечислить по правилу на карту вместо обобщения через «иначе»), но проверка минимального
числа правил требует внутренностей `checkRuleRunner`, поэтому она не написана, а не угадана.
`grid-draw` и `claim-check` уже требуют точного ответа, `pattern-expand` уже просит правило —
там зазора нет.

## Чем доказано

- `tests/tier-demand.test.mjs` — 34 проверки: канонический порядок мира никогда не отвергается,
  повтор и лишний шаг отвергаются на уровне 3 и проходят на уровнях 1 и 2, провал не может
  стать проходом, остальные четыре семейства не затронуты.
- `tests/e2e/current-session-ui.mjs` → `verifyTierLadder` — реальный Chromium на
  `/session/w2-s1`, mastery подставляется в базу (0 / 0.5 / 0.9), и три экрана обязаны
  различаться: `data-worked-example` = `open` / `folded` / `none`. Скриншоты
  `tier-1-w2-s1.png`, `tier-2-w2-s1.png`, `tier-3-w2-s1.png` лежат в evidence-папке прогона.

## Что осталось из §4

- Калибровка первых трёх задач не сделана — старший ребёнок по-прежнему идёт до уровня 3
  восемь задач.
- Поле «Сказать своими словами» по-прежнему свёрнуто и подписано как дополнительное.
