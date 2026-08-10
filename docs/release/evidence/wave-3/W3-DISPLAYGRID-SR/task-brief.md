# Task brief — W3-DISPLAYGRID-SR

## Goal

Give the current grid reference a semantic screen-reader equivalent. The learner
must hear what cells are filled, what target cells are shown, and which cells
mismatch after an attempt; visual grid cells remain decorative and non-focusable.

## Base and scope

- Base SHA: `b923788d724943fb3a2c9c7abadc352ef55bb2a4`
- Allowed files: `src/components/curriculum/DisplayGrid.tsx`,
  `tests/display-grid-accessibility.test.mjs`, this brief.
- Do not change task scoring, target visibility policy, routes, production config,
  or child data handling.
- Timebox: 20 minutes; no deploy, secrets, external accounts, or provider calls.

## Acceptance criteria

1. The meaningful grid is not `aria-hidden`.
2. Its accessible name includes a stable Russian description of filled, target,
   and mismatch cells, including an explicit empty state.
3. The decorative 16-cell drawing does not create 16 focus stops or duplicate
   announcements.
4. Existing grid sizing/visual appearance and task behavior remain unchanged.

## RED / GREEN

- RED: the contract finds `aria-hidden="true"` on the meaningful grid and no
  cell-summary helper.
- GREEN: the contract, task-surface tests, accessibility appendix, lint, and build
  pass on the new SHA.

## Receipt

Coordinator writes `agent-receipt.json` after independent review and SOL
verification under this ticket folder.
