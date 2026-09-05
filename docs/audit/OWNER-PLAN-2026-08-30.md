# Owner Plan of Record — 2026-08-30

## Mandate

CEO said «владей» on 2026-08-30: two weeks hands-off ownership of the MindShift
experience layer. CEO keeps three gates only:

1. **Money** — any spend decision (provider bills, tooling, pilot budget).
2. **Prod-ship button** — the actual production deploy/release trigger.
3. **Family-codes rotation** — rotating parent/child access codes stays owner-only.

Everything else — architecture, UX, sprint sequencing, code — is this branch's call.

## Verdict

Rebuild the experience layer. Keep the engine. The fail-closed safety moderation,
the deterministic judge, and the 15 sessions of curriculum content are proven —
see `docs/audit/AUDIT-MCKINSEY-2026-08-29.md`. The audit's finding is that the
*engine* works and the *experience wrapped around it* does not: children hit a
board before they understand the goal, input surfaces don't visually match what
they're supposed to produce, and progress signals (chips, certificates) lie about
state. This plan targets the wrapper, not the engine.

## Benchmark anchors (2026-08-30 sweep)

- **One screen = one action, one instruction line inside the card.** Brilliant and
  Duolingo never stack an explanation block above an interactive surface — the
  instruction lives inside the card the child is about to touch.
- **Named reactive companion.** Koji-style: the monster is not decorative, it has
  states that respond to child input, and it has a name.
- **Named mechanic ladder per week.** CodeMonkey names each mechanic explicitly and
  ladders difficulty session-to-session instead of reusing one drill three times.
- **World-theme bleeding into layout, not just background.** Uchi.ru and Khan Kids
  let the week's theme change layout, iconography, and chrome — not just a beige
  background behind the same components.

## Sprints

### S1 — Session shell, one-step-per-screen
Collapse the session flow into intro screen → task → celebration, each a discrete
screen instead of stacked blocks. Builds on the TaskWorkspace/session-page fixes
already landed in `1fb0b00` (goal caption above the surface, collapsible concept
explanation).
**Gate:** walkthrough screenshots (`scripts/e2e/walkthrough-audit.mjs`) show ≤2
text blocks above any interactive surface, for every session.

### S2 — World theming + reactive monster
Give each week's world a distinct visual language (layout/chrome/iconography, not
just a background swap) and give the companion monster named, distinguishable
reaction states tied to child input (correct, retry, stuck, celebrate).
**Gate:** 4 visually distinct worlds across the curriculum; monster has ≥3 states
provably wired to different code paths, not just CSS variants of one state.

### S3 — Mechanic interleaving + text dedup
Break the one-family-per-week pattern: no week may run the same task-surface
family for all 3 sessions. Deduplicate judge/tutor prompt text — no two sessions
may share a verbatim `promptRu` string.
**Gate:** automated check across `src/lib/curriculum.ts` — zero weeks with 3/3
sessions on one family; zero verbatim duplicate `promptRu` values curriculum-wide.

### S4 — Harness + release gate + pilot review
Get `scripts/e2e/walkthrough-audit.mjs` and the full e2e suite green, run
`npm run verify:release` clean, then hand the CEO a before/after screenshot set
for pilot review.
**Gate:** CEO taps ship. Not "looks done" — the literal ship action, which stays
a CEO-only gate per the mandate above.

## Evidence discipline

Every sprint closes with before/after screenshots from the walkthrough harness,
not a written description of improvement. A sprint without a screenshot pair is
not closed.

## Non-negotiables carried forward from AGENTS.md

No secrets in chat or commits. No prod DB writes, no deploys, no push to `main`
without explicit owner approval. `LEGACY_MODULE1_ENABLED` / `E2E_LEGACY_LESSONS`
stay off. Age target is 8-11 per CEO decision 2026-08-29 (already reflected in
`src/lib/moderation.ts` on this branch).
