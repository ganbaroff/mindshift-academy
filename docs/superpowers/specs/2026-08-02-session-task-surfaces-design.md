# Session task surfaces design

**Status:** approved by the user through the Academy release-recovery plan and autonomous-execution instruction
**Scope:** Wave 1 current `/session` learner experience

## Decision

Use one accessible structured interaction for each task family as the primary learner path.
Keep literal free-text interpretation as an optional secondary path. Do not build a universal
canvas, and do not retain free text as the only way to act: both alternatives either obscure
the expected result or keep course completion dependent on a provider.

## Learner state

Every task screen presents, in this order:

1. the task goal and current adaptive level;
2. the visible data needed to decide;
3. a free worked example using different data;
4. one family-specific workspace;
5. one primary action, `Проверить`;
6. specific asynchronous feedback in a polite live region;
7. free `Как действовать` help and the existing paid hint as distinct controls.

The first encounter with a family starts with its example expanded. Later encounters keep a
free `Показать пример` disclosure. The example never copies the current target, claims, map,
or expected pattern.

## Family workspaces

- `grid-draw`: 4×4 semantic toggle grid; the child selects cells and submits those cells.
- `sequence-world`: add/remove ordered action cards; the order is shown as a numbered list.
- `rule-runner`: choose one action for each visible ahead-tile case; map success conditions
  remain server-only.
- `pattern-expand`: choose arithmetic or cycle, then enter a compact start/step or short cycle;
  expected terms remain server-only.
- `claim-check`: every visible claim has one labelled `Верно`/`Неверно` radio pair; truth
  values remain server-only.

All controls have at least a 44px target, keyboard operation, visible focus, Russian labels,
and no drag-only interaction. Motion uses transform/opacity, stops under reduced motion, and
never gates task completion.

## Data and trust boundary

`attemptRequestSchema` accepts one of `utterance`, legacy fail-closed `choiceId`, or a closed
`program` union. The route resolves the task from `sessionId/taskId`, validates the supplied
program against the server-owned family, executes the existing deterministic checker, and
persists through the same `finalizeAttempt` path. A client program never supplies family,
target, tier, truth labels, expected pattern, or map success conditions.

`toPublicSession` strips `hintRu`, claim truth, `patternExpected`, and `RuleMap.successWhen`.
It exposes claim text, pattern expansion count, grid goal where the pedagogy requires it, and
rule map IDs/ahead tiles. Collision grid targets remain hidden in the page until the existing
reveal condition.

## Adaptive level

The session route's computed `offeredTier` is stored by the page, announced as `Уровень 1–3`,
and passed to the workspace. Tier 1 includes short world reminders, Tier 2 uses normal labels,
and Tier 3 removes starter wording without hiding assessed data. Server-side
`effectiveTaskTier` remains authoritative for mastery and persistence.

## Failure and degraded behavior

Structured programs do not call a live provider. A network error preserves local workspace
state and offers retry. Provider degradation affects only the optional text path and never
reveals an answer. Invalid or mismatched programs return `400 BAD_PROGRAM`; production test
bypass remains impossible.

## Verification

Pure contract tests cover public-answer stripping, family-program validation, and negative
payloads. Render tests cover semantic controls and labels for all five families. Current
`/session` Playwright drives controls rather than posting canonical answers directly, captures
mobile/desktop screenshots, tests keyboard and reduced motion, and uses only the existing
development-only page/API bypass seam.

