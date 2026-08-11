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
