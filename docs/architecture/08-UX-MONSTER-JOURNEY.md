# 08 — UX: the monster's journey (v1.2)

> **Read §10 first.** An external design review on 2026-08-07 rejected the "mission control"
> frame this document was written around, and we accepted the rejection. §10 is the current
> decision and overrides §4's mission verbs, §4.4's ranks and §5's brief card wherever they
> disagree. Everything else — the three-field rigor, the re-ask mechanic, the sticky-bar law,
> the six implementation steps — survives unchanged.
>
> Extends `02-PRODUCT-AND-UX.md`; does not replace it. Scope is all 15 sessions of weeks 1-5.
> Nothing here changes the task engine's verdicts, moderation, consent or reward rules.

## 1. The two defects this exists to fix

Both reported by the CEO after using the product himself, 2026-08-07.

1. **The task doesn't say what a right answer looks like.** Verbatim: *«Скажи шаги для сэндвича
   в любом порядке»* — «для сэндвича» can mean *make* one or *assemble* one, and «в любом
   порядке» contradicts a task that grades order. The child guesses what is being asked before
   they can even try.
2. **A returning child restarts at step 1.** The resume logic (`src/lib/tasks/resume.ts`) is
   correct *inside* a session, but the dashboard CTA (`src/app/dashboard/page.tsx:200`) and
   onboarding (`src/app/onboarding/page.tsx:119`) both hardcode `/session/w1-s1`. The resolver
   that knows the right session already exists (`src/app/api/continue/route.ts:59`,
   `firstIncompleteSessionId`) but returns JSON and nothing links to it.

Everything below serves those two. Gamification is the vehicle, not the goal.

## 2. The one rule: every task states three things before the child acts

A task is only shippable when the screen answers, in the child's own reading order:

| Field | Question it answers | Rule |
|---|---|---|
| `goalRu` | **Цель** — what must exist when I'm done | one sentence, names the finished thing |
| `givenRu` | **Что дано** — what I have to work with | an explicit list, never «и т.д.» |
| `doneWhenRu` | **Готово, когда** — how I will know it worked | a condition the child can check themselves |

Rewritten example, the exact task that failed:

- ~~«Скажи шаги для сэндвича в любом порядке»~~
- **Цель:** собрать сэндвич из того, что лежит на столе.
- **Что дано:** хлеб, сыр, масло, нож.
- **Готово, когда:** ты назвал 4 шага, и каждый следующий можно сделать только после предыдущего.

This is a content contract, not a UI decoration: a task without all three does not render.

## 3. The mechanic: the monster asks back on the radio

The monster is a robot on a mission; the child is its operator. When the command is ambiguous
the monster **asks one question instead of failing the child**.

Triggering is **deterministic code, not a model call** — it must be free, instant, identical
every time, and testable:

- a verb with no object («намажь» — чем? на что?)
- an object with no verb («хлеб и сыр»)
- order matters for this task but no ordering words were used
- a pronoun with no referent («положи его»)
- fewer than N meaningful words, or only filler

Rules that keep it from becoming a nag:

- **at most 2 re-asks per task**, then the monster offers its hint for free;
- a re-ask is **not an attempt**: nothing is recorded, no crystal is spent, no failure counter moves;
- the question always quotes the child's own words back («ты сказал *намажь* — чем намазать?»);
- after the second re-ask the monster says what it *would* do and asks for confirmation.

This is the product teaching its own subject: precision in phrasing, learned by being asked.

## 4. Course shape — one language across weeks 1-5

Each week is a **mission cluster** of 3 sessions. The task family already differs per week; v1.1
gives each a stable mission verb so a child always knows what kind of thinking is wanted.

| Week | Idea | Mission verb | Existing task family |
|---|---|---|---|
| 1 | Точность | «Опиши так, чтобы получилось» | grid-draw |
| 2 | Порядок | «Собери план по шагам» | sequence |
| 3 | Правило | «Объясни правило» | rule |
| 4 | Образец | «Покажи образец» | pattern |
| 5 | Перенос | «Докажи, что понял» | claim |

**Map instead of a step counter.** 15 dots in 5 clusters: done / current / locked. The current
dot pulses. Opening the app opens the map on the current mission — this is where defect 2 dies,
because the map is the entry point and it is computed, never hardcoded.

**Ranks instead of raw XP.** Стажёр → Оператор → Связист → Штурман → Командир, one per completed
week. XP keeps running underneath for the parent report; the child sees a rank they can name.
Crystals keep their current job — the only thing they buy is hints — so the existing economy and
its idempotency guarantees are untouched.

## 5. Screen anatomy — one layout, all 15 sessions

```
┌─────────────────────────────────────┐
│ ← карта   Неделя 2 · Миссия 2   Оператор │  mission strip
├─────────────────────────────────────┤
│ ЦЕЛЬ        собрать сэндвич         │
│ ЧТО ДАНО    хлеб, сыр, масло, нож   │  brief card — always 3 fields
│ ГОТОВО КОГДА 4 шага по порядку      │
├─────────────────────────────────────┤
│           [ workspace ]             │  unchanged per task family
├─────────────────────────────────────┤
│ 🤖 «ты сказал намажь — чем намазать?»│  radio panel (re-ask / feedback)
├─────────────────────────────────────┤
│ [ Проверить ]      [Пропустить] 💡  │  sticky bar
└─────────────────────────────────────┘
```

Sticky-bar law, learned the hard way (see `docs/release/MINDSHIFT-PILOT-READINESS.md`, the retry
wall): **Проверить is never replaced by another control.** Пропустить appears *beside* it after a
failure. Passing swaps the pair for a single Дальше. Two independent slots, never a ternary.

## 6. What must not move

- task verdicts, `interpretUtterance`, moderation, `finalizeModeration` fail-closed behaviour;
- consent gates on every outward call;
- crystal idempotency (`taskPassEventId`);
- existing content files — the three new fields are **optional** in the type until every task has
  them, so nothing breaks mid-migration;
- the legacy `/lesson` island stays exactly as gated as it is today.

Everything in §7 ships behind `NEXT_PUBLIC_UX_V11`, off by default, until step 6.

## 7. Implementation — six steps, each shippable alone

Small, reversible, verified one at a time. No step depends on the design mockup arriving.

**Step 1 — resume (no design needed, fixes defect 2).** Give `/api/continue`'s answer a page: a
server component at `/continue` that resolves `firstIncompleteSessionId` and redirects. Point the
dashboard CTA and onboarding at `/continue`. The per-session pills keep their direct links.
*Receipt:* finish a session, leave, come back, land on the next one.

**Step 2 — task skeleton (fixes defect 1).** Add optional `goalRu` / `givenRu` / `doneWhenRu` to
`ContentTask`. Render them as the brief card when present. Backfill week 1, then 2-5. Add a
content test: once a week is backfilled, all three fields are required for that week.
*Receipt:* the sandwich task reads as §2 shows.

**Step 3 — the radio.** A pure `clarify(utterance, task)` in `src/lib/tasks/`, deterministic, unit
tested against a fixture list of real child phrasings. Wire it before the attempt is recorded:
if it returns a question, show it and record nothing.
*Receipt:* the fixture table, plus a session where two re-asks then a free hint.

**Step 4 — sticky bar v1.1.** Already partly landed in `0304134`; v1.1 only restyles it. The
independence of the two slots is now asserted by a11y receipt A12.

**Step 5 — map and ranks.** Replaces the numbered pill row. Map data comes from the same resume
derivation as step 1 — one source of truth for "where am I".

**Step 6 — turn the flag on.** Precondition, non-negotiable: `test:e2e:current-sessions` runs in
CI. Today `verify:release` only drives the legacy `/lesson` route, which is how a broken retry
button shipped green.

## 8. Prompt for the external design tool

Hand this over as-is. It asks for a static mockup only — no framework, no build — so it can be
read, argued with, and then re-implemented in our React components without importing anyone
else's code.

---

```
Build a single static HTML file (inline CSS + vanilla JS, no frameworks, no build step,
no external requests) that mocks the learning screen of a children's educational web app.

CONTEXT
Children aged 8-14 learn to phrase instructions precisely. A child writes instructions to a
friendly monster-robot; the monster does exactly what it is told, so sloppy phrasing produces
funny wrong results. Russian interface. Most users are on cheap Android phones.

PALETTE (use exactly)
background #070b14, surface #11182a, border rgba(255,255,255,0.08),
text #f5f7ff, muted #94a3b8, primary violet #8b5cf6, accent cyan #22d3ee,
warning amber #f59e0b, success emerald #10b981.

HARD REQUIREMENTS
- Mobile first: must be perfect at 320px wide, no horizontal scrolling at any width.
- Every tappable control at least 44x44 px. Base font 16px, nothing below 12px.
- Works with keyboard only; visible focus ring of at least 3px.
- Respect prefers-reduced-motion: no animation when it is set.
- No emoji as the only meaning-carrier; no icon fonts, draw inline SVG.

SCREEN 1 — MISSION MAP
15 dots in 5 clusters of 3, labelled Неделя 1..5 with subtitles
Точность / Порядок / Правило / Образец / Перенос.
Dot states: done (filled, check), current (pulsing ring), locked (dim, lock).
Header shows a rank badge: Стажёр / Оператор / Связист / Штурман / Командир.
Tapping the current dot opens screen 2.

SCREEN 2 — MISSION
Top strip: back-to-map link, "Неделя 2 · Миссия 2", rank badge.
Brief card, always exactly three labelled rows:
  ЦЕЛЬ           собрать сэндвич из того, что на столе
  ЧТО ДАНО       хлеб, сыр, масло, нож
  ГОТОВО, КОГДА  ты назвал 4 шага, и каждый следующий возможен только после предыдущего
Workspace: a text input plus a list where the child's steps appear in order, each removable
and reorderable by two arrow buttons (no drag — drag must never be the only way).
Radio panel: a small monster avatar (inline SVG, friendly, two eyes, two antennae) with a
speech bubble.
Sticky bottom bar: "Проверить" (primary violet), and a hint button showing "💎 5".

FOUR STATES, all reachable by buttons in a small debug row at the top of the mock:
1. Пусто — nothing typed. Bubble: "жду команду". Only Проверить, disabled.
2. Переспрос — the monster asks back, quoting the child:
   «ты сказал "намажь" — чем намазать?». This is NOT an error: no red, no shame colour,
   the bubble is cyan-tinted. Проверить stays enabled.
3. Ошибка — the answer was checked and did not match. The bubble shows what the monster
   understood, in its own voice, and points at the difference. The sticky bar now shows
   BOTH "Проверить" (primary) AND "Пропустить" (secondary, quieter) side by side.
   This is a hard requirement: the check button must never be replaced by the skip button.
4. Успех — emerald accent, the bubble congratulates in one short line, and the sticky bar
   shows a single "Дальше".

TONE
Calm and factual. Never "неправильно", "провал", "ты ошибся". The monster describes what it
did, not what the child failed to do.

DELIVERABLE
One .html file. Comment each section. Keep all mock data in one JS object at the top so the
copy can be swapped without touching markup.
```

---

## 9. Open questions for the CEO (not an agent's call)

- Rank names: the five above are a proposal, not canon. Azerbaijani-Russian bilingual families
  may read «Связист» as unfamiliar — worth testing on one real child before it is baked in.
- Whether the map replaces the dashboard's session pills for the parent too, or only for the child.

---

## 10. Design review, 2026-08-07 — accepted, with one pushback

An external designer read the handoff package and argued against the frame. We accept most of
it. This section is the current decision.

### 10.1 Accepted without change

**The frame is the monster, not a job title.** Mission control and duel are both dropped. The map
becomes stops on the monster's route. Their argument, which we could not counter: a robot/mission
metaphor reads as babyish at 13 and as unfamiliar vocabulary at 8, while a creature you are
raising works at both ends because the relationship *is* the metaphor. It is also cheaper — the
monster already exists in code and in the child's head; a second fiction was pure overhead.

**A growing monster instead of ranks.** «Штурман» is a label with no felt weight at either age.
A monster that visibly gains a part is legible without reading, and it cannot be gamed by
comparison — which matters, because our consent regime forbids every social surface anyway.
Decisive point we had missed: ranks plus growth is two currencies for one feeling. Gems keep
their single job (hints). No rank system is built.

**Re-ask lands as a new message under the existing feedback, never replacing it.** The child
never watches their own answer disappear. Their text stays editable in place — retyping from
scratch punishes a child who was 90% right. Two free re-asks, not three. And the difference from
failure is carried by voice register, not colour: the monster is curious, speaks in first person,
and gets none of the visual treatment the fail state uses.

**The map reveals the current cluster only,** plus a compressed trail of what is done. Twelve
visible locked dots is the size-of-the-mountain problem. A child needs proof of what is behind
and one clear next step.

**The stuck child is never interrupted.** After two failures the monster does not switch modes,
open a modal, or ask if you are struggling — all of which say *you are being watched*. It simply
names what it noticed and offers the hint unprompted, in a message structurally identical to
normal feedback: «тут ты уже дважды пробовал — хочешь подсказку?». The hint is free by then.

### 10.2 Where we push back: «готово, когда» must be visible before the first attempt

They proposed folding the goal into the one-line prompt, showing the materials inline in the
workspace, and revealing "done when" progressively — in full only after a first miss.

We accept the first two. We do not accept hiding the success condition until after a failure,
and the reason is the defect that started this whole thread: *«Скажи шаги для сэндвича в любом
порядке»* failed precisely because the child could not tell what a finished answer looked like.
Revealing that only after they get it wrong makes the first attempt a guess by design, and the
child most hurt by a guess is the careful one who quits after two failures.

**The compromise, which we believe answers their real objection (a reading gate):**

- the goal lives inside the prompt line — accepted;
- what is given is visible in the workspace, not stated in prose — accepted;
- **«готово, когда» is always present, but as one short line in the monster's voice, not a
  labelled field** — e.g. «получится, когда назовёшь 4 шага по порядку». One line, no label, no
  third row to read;
- the full condition, with the reasoning, expands after a miss — accepted, as the *expansion*
  rather than the first appearance.

That is one extra line of reading, not three labelled rows, and it keeps the rigor exactly where
the ambiguity actually lived.

### 10.3 The three things they said we had not specified

**Skip's exit state.** A skip never closes a task. It records no verdict, marks nothing red, and
the task stays revisitable from the trail. On the map, a stop with a skipped task shows as
*partial*, visually distinct from both done and untouched — the honest state, without a penalty
reading. A session with a skipped required task simply does not read as complete, which is
already how `sessionComplete` behaves in code, so no engine change.

**Free text versus an open re-ask.** One rule: **while a re-ask is open, the next submission —
from the structured workspace or the free-text box — answers the re-ask.** It is not a fresh
attempt, nothing is recorded, no gem moves. The re-ask closes on that submission. This removes
the ambiguity without adding UI.

**The 8pm, 11%-battery child.** Agreed, and no new UI: the map is the exit. Progress is already
saved per task, the resume fix (step 1) makes returning land on the right stop, so leaving needs
no confirmation and no framing — the back-to-map link *is* the judgment-free stop. We will make
sure nothing on that path uses loss language ("ты потеряешь прогресс") because there is nothing
to lose.

### 10.4 What this changes in the implementation steps (§7)

Steps 1, 3, 4 and 6 are unaffected. Step 2 changes shape: the three fields stay in the content
type as the authoring contract, but render as prompt-line + workspace + one monster line rather
than three labelled rows. Step 5 becomes "map with current-cluster reveal + monster growth"
instead of "map and ranks", and it now needs a small addition to the `Monster` model for the
parts the child has earned — additive, one migration, no change to existing rows.

### 10.5 Still open, and it is the CEO's call

The designer is building the mockup on this basis. Before it is implemented, one real child
should see the growing monster and say what the new part means to them. If a part does not
read as a reward without explanation, the growth idea has the same problem the ranks had — it
just fails more expensively, because growth is drawn art and a rank is a word.
