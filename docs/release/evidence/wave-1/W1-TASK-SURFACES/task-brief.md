# TaskBrief — W1-TASK-SURFACES

- **Ticket:** `W1-TASK-SURFACES`
- **Goal:** give every Academy task family a visible, keyboard-operable learner workspace and a free worked example that does not reveal the current answer.
- **Product area:** current `/session` learner experience, Wave 1.
- **Base SHA:** `afae82049f7910234e8b15bb52a9a6bc0af07f1a`
- **Timebox:** 20 minutes for implementation; split before extending scope.

## Allowed files

- `src/components/curriculum/task-surfaces/**`
- `tests/session-task-surfaces.test.mjs`
- `package.json`
- `docs/release/evidence/wave-1/W1-TASK-SURFACES/**`

## Forbidden actions

- Do not edit the session page or API routes in this ticket.
- Do not expose claim truth, expected pattern terms, or rule success conditions.
- Do not deploy, change production environment/data, access secrets, or send invitations.
- Do not add provider calls or answer-bearing fallbacks.

## Input and output interfaces

- Input: `PublicContentTask`, adaptive `offeredTier`, disabled state, and `onSubmit(program)`.
- Output: one family-specific `TaskWorkspace` that emits a closed `StructuredProgram` only after its visible input is complete.

## Acceptance criteria

1. All five families render a named semantic workspace with visible current task data.
2. Each family offers a free worked example with unrelated fixed data and an explicit example label.
3. Controls have accessible names, keyboard semantics, visible focus styling, and minimum 44px targets.
4. Each workspace exposes exactly one primary `Проверить` action; it is disabled until the program is complete.
5. Tier 1 includes a short world reminder; all tiers announce their adaptive level.
6. No component consumes a server answer key or infers a current answer.
7. Grid reset, sequence remove/reset, and other edits are deterministic and local.
8. Rule tasks can express the curriculum's explicit `иначе` branch, not only one-off tile cases.

## TDD commands

- **RED:** `npx tsx tests/session-task-surfaces.test.mjs`
  - Expected reason: `TaskWorkspace` does not exist before implementation.
  - Expected exit code: `1`.
- **GREEN:** `npx tsx tests/session-task-surfaces.test.mjs`
- **Neighbour:** `npm run test:structured-attempt`
- **Quality:** `npm run lint` and `npm run build`

## Stop condition

Stop with `NEEDS_CONTEXT`, `BLOCKED`, or `TIMEBOX_EXPIRED` if the public task payload cannot support a family without answer-key data, a requested interaction needs a new API contract, a secret is encountered, or the ticket exceeds its timebox.

## Receipt

Write `docs/release/evidence/wave-1/W1-TASK-SURFACES/agent-receipt.json` with RED/GREEN evidence, changed files, base/head SHA, concerns, and confirmation of no production or secret operations.
