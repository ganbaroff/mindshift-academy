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

1. **Weeks 1, 3, 4, 5 are still one world each.** Only week 2 has been reworked. Week 1's
   21 grid tasks and their six repeated prompts are untouched.
2. **Their transfer tasks still do not transfer.** Same defect as week 2 had, in four places.
3. **12 sessions still have no brief.** w1-s2, w1-s3, and all of weeks 3–5. `validateSession`
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

1. **The invariant test first, red.** `tests/curriculum-variety.test.mjs` asserting: no week
   uses one world for all three sessions; every transfer leaves its practised world; no prompt
   sentence appears twice in a week; every session carries the brief. It fails on four weeks.
   Then each week's PR turns part of it green. Curriculum by red-green, not by opinion.
2. **Week 4** — pure authoring, no engine, no schema change. Proves the shape of the work.
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
