# 002 — Give the tappable grid cell the feedback it has none of

> **Corrected after the browser feel-check.** The first draft of this plan named
> `DisplayGrid.tsx:66`. That component is `role="img"` — the read-only target picture,
> which nobody taps. The cell a child taps is `GridDrawSurface.tsx:67`, and it had no
> transition at all. The 300ms in DisplayGrid was left alone: a picture that updates once
> per attempt is "occasional" under AUDIT §1, and changing it was never justified.

- **Status**: DONE (applied and browser-verified 2026-08-09)
- **Commit**: e840c60
- **Severity**: HIGH
- **Category**: Purpose & frequency (§1) + Easing & duration (§2)
- **Estimated scope**: 1 file, 1 line

## Problem

`DisplayGrid` is the most-tapped surface in the product: week 1 is entirely grid-draw,
and a child taps 2–8 cells per attempt, several attempts per task, seven tasks per
session. Each tap currently fades over 300ms.

```tsx
/* src/components/curriculum/DisplayGrid.tsx:66 — current */
"w-11 h-11 sm:w-12 sm:h-12 rounded-lg border transition-colors duration-300 ";
```

AUDIT.md §2 budgets button-press feedback at 100–160ms; 300ms is nearly double the top of
that range. §1 is harsher still: at tens of interactions per session this is high-frequency
motion, where the guidance is "remove or drastically reduce". A child selecting four cells
quickly sees four laggy fades chasing their finger, and on a cheap Android the paint cost
of four simultaneous 300ms colour transitions is real.

## Target

```tsx
/* target — src/components/curriculum/DisplayGrid.tsx:66 */
"w-11 h-11 sm:w-12 sm:h-12 rounded-lg border transition-colors duration-[120ms] [transition-timing-function:var(--ease-out)] ";
```

120ms sits inside the §2 press-feedback band and below the 160ms used for the button in
plan 001 — a cell is a smaller, faster object than a primary action, and the grid must
never feel like it lags the finger.

## Repo conventions to follow

- `--ease-out` is defined by plan 001 in the `:root` block of `src/app/globals.css`.
  **This plan depends on 001 having landed.** If `--ease-out` is not present in that file,
  execute plan 001 first.
- Tailwind v4 bracket syntax for arbitrary values, already used throughout this repo.

## Steps

1. In `src/components/curriculum/DisplayGrid.tsx:66`, replace `duration-300` with
   `duration-[120ms] [transition-timing-function:var(--ease-out)]`.
2. Change nothing else in the file — the colour classes, the mismatch/target/filled
   branches and the ARIA labelling all stay exactly as they are.

## Boundaries

- Do NOT alter the cell size classes (`w-11 h-11`) — those are the 44px touch-target
  minimum and are asserted by `npm run test:ui`.
- Do NOT change which colours mean what; the mismatch amber is a pedagogy decision.
- Do NOT convert this to a framer-motion component.

## Verification

- **Mechanical**: `npm run test:display-grid-accessibility` → passes;
  `npm run test:ui` → passes; `npx tsc --noEmit` → clean.
- **Feel check**: `npm run dev`, open `/session/w1-s1`, tap four cells in quick succession:
  - each cell's colour lands while the finger is still moving to the next one;
  - no visible trailing fade behind the finger;
  - in the DevTools Animations panel at 10% speed, the fill arrives fast then settles.
- **Done when**: tapping a row of four cells feels like flipping switches, not like
  painting, and both grid test suites are green.
