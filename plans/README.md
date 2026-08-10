# Motion plans — audit of 2026-08-09

Produced by the `improve-animations` skill (Emil Kowalski's animation bar) against commit
`e840c60`. Audit was read-only; the three plans were then executed and verified in a real browser
(`scripts/e2e/motion-check.mjs`, all five assertions green). Each plan below is
self-contained and can be executed by any agent, including a cheaper model.

Scope audited: `src/app/session/[id]/page.tsx`, `src/components/support/`,
`src/components/curriculum/task-surfaces/`, `src/components/guide/`, plus every hit from a
repo-wide sweep for `transition`, `animation`, `@keyframes`, `motion.`, `ease-in`,
`transition: all`, `scale(0)` and `prefers-reduced-motion`.

## Plans

| # | Title | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| [001](001-press-feedback-and-motion-tokens.md) | Press feedback on pressable controls, on shared motion tokens | HIGH | Physicality, Cohesion | DONE |
| [002](002-grid-cell-feedback-duration.md) | Give the tappable grid cell the feedback it had none of | HIGH | Frequency, Duration | DONE |
| [003](003-gate-hover-motion-behind-real-hover.md) | Stop hover scale sticking after a tap on touch | MEDIUM | Accessibility, Performance | DONE |

**Execution order: 001 → 002 → 003.** Both 002 and 003 consume the `--ease-out` token that
001 introduces; running them first leaves an undefined custom property, which fails silently
as "no easing" rather than loudly.

## What the audit did NOT find

Worth recording, because these were checked and are correct:

- **No `ease-in` anywhere on UI.** The single worst and most common motion defect is absent.
- **No `scale(0)` entrances.** Nothing appears from nothing.
- **`prefers-reduced-motion` is genuinely handled**, not faked: `useReducedMotion()` gates
  the confetti at `src/app/session/[id]/page.tsx:360` and the explanation's entrance at
  `:689`, and `TapHint` uses Tailwind's `motion-safe:` variant rather than removing the cue.
- **The pulsing tap hint is not a finding.** `src/components/guide/TapHint.tsx:1-3`
  documents it as a language-independent cue for pre-readers, and it is `motion-safe:`
  gated. AUDIT.md's "high-frequency looping motion" rule yields to a documented
  accessibility decision.
- **No command-palette-style transitions**, and the one keyboard-driven surface that does
  transition — the code boxes at `src/app/enter-code/page.tsx:131`,
  `transition-[border-color,box-shadow]` — is typed once at onboarding and animates colour,
  not movement. Rare frequency, no travel: not a finding under §1.

## Outside this skill's scope, but verified while auditing

`src/app/enter-code/page.tsx:131` sizes each code box `h-12 w-8` — **32px wide, under the
44px touch minimum**, on the one control an unsupervised child must use to get in. This is
the same defect `docs/design-handoff/v1.1/02-CURRENT-STATE.md` reported as "30px wide", and
it is still open. Not a motion finding, so no plan here — but it belongs on the pilot list.

## Missed opportunities (additive — no plan written)

1. **The re-ask and stuck-help bubbles teleport in.** `src/app/session/[id]/page.tsx` renders
   `data-testid="monster-reask"` and `data-testid="stuck-notice"` with no entrance at all,
   while the designer's own mockup gave every monster bubble a 280ms rise. This is the
   product's emotional moment — the monster speaking instead of failing the child — and it
   currently appears as a hard cut. A `translateY(8px) → 0` + opacity over 200ms with
   `--ease-out`, gated on `useReducedMotion()`, would match the existing `motion.p` at
   `:688`. Deliberately left as an opportunity rather than a plan: it is new UI behind
   `NEXT_PUBLIC_UX_V11` and should be judged on a real device first.
2. **The monster's growth has no motion budget spent on it.** Earning a body part once per
   week is the rarest, highest-emotion moment in the whole five-week course — exactly where
   AUDIT.md §1 permits delight. Blocked upstream: `docs/architecture/08-UX-MONSTER-JOURNEY.md`
   §10.5 requires one real child to see the growing monster before it is built at all.
3. **Session completion reuses the same confetti as a single task pass.** Finishing a
   session and passing one of seven tasks currently feel identical.
