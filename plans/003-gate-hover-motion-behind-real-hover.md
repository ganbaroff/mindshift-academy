# 003 — Stop hover scale from sticking after a tap on touch devices

- **Status**: DONE (applied and browser-verified 2026-08-09)
- **Commit**: e840c60
- **Severity**: MEDIUM
- **Category**: Accessibility (§6) + Performance (§5)
- **Estimated scope**: 5 files, ~9 lines

## Problem

Seven controls grow on `:hover`, and `@media (hover: hover)` appears nowhere in the
codebase — `grep -rn "hover: hover" src/` returns nothing. AUDIT.md §6 is explicit that
touch fires false hovers on tap: on a phone the enlarged state latches after the finger
lifts and only clears when something else is touched. The product's users are children on
cheap Android phones, so this is the majority case, not the edge case.

Confirmed locations:

```
src/app/page.tsx:138                        hover:scale-[1.02]
src/components/chat/PromptInput.tsx:283     hover:scale-[1.02]
src/components/lesson/VideoSimulator.tsx:60 hover:scale-105 / hover:scale-100
src/components/modals/MonsterCard.tsx:101   hover:scale-105
src/components/modals/MonsterCard.tsx:138   hover:scale-[1.02]
src/components/modals/MonsterCard.tsx:153   hover:scale-[1.02]
```

Two of those also animate every property at once:

```tsx
/* src/components/modals/MonsterCard.tsx:138 — current */
className="… hover:scale-[1.02] transform transition-all cursor-pointer …"
```

AUDIT.md §5: `transition: all` "animates unintended properties off-GPU — always a
finding". Here it drags colour, shadow, border and transform through one untyped
transition on a modal that a child opens to look at their monster.

## Target

Tailwind v4 exposes a `hover` variant that already respects `@media (hover: hover)` only
when configured to; this repo has no config file, so gate explicitly with the arbitrary
variant:

```tsx
/* target — pattern for every listed line */
[@media(hover:hover)]:hover:scale-[1.02]
```

And replace the two `transition-all` with an explicit property list:

```tsx
/* target — src/components/modals/MonsterCard.tsx:138 and :153 */
transition-[transform,background-color] duration-[160ms] [transition-timing-function:var(--ease-out)]
```

## Repo conventions to follow

- `--ease-out` comes from plan 001. **Depends on 001.**
- Exemplar of an explicit transition property list already in the repo:
  `src/components/chat/PromptInput.tsx:345` — `transition-[transform,box-shadow,background-color]`.
- `src/components/lesson/**` and `src/app/lesson/**` belong to the legacy island; see
  boundaries.

## Steps

1. `src/app/page.tsx:138` — prefix the hover scale: `[@media(hover:hover)]:hover:scale-[1.02]`.
2. `src/components/chat/PromptInput.tsx:283` — same prefix.
3. `src/components/modals/MonsterCard.tsx:101` — same prefix on `hover:scale-105`.
4. `src/components/modals/MonsterCard.tsx:138` — same prefix, and replace
   `transform transition-all` with
   `transition-[transform,background-color] duration-[160ms] [transition-timing-function:var(--ease-out)]`.
5. `src/components/modals/MonsterCard.tsx:153` — identical treatment to step 4.
6. Leave `src/components/lesson/VideoSimulator.tsx:60` alone and note it in the PR body:
   it is inside the flag-disabled legacy Module 1 island (`src/proxy.ts:28`,
   `LEGACY_MODULE1_ENABLED`), and `AGENTS.md` §7 forbids touching that surface casually.

## Boundaries

- Do NOT touch anything under `src/app/lesson/**` or `src/components/lesson/**`.
- Do NOT remove the hover effects — desktop parents do use a mouse; only gate them.
- Do NOT change `cursor-pointer`, focus rings, or any colour.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `npx tsc --noEmit` clean; `npm run lint` clean; `npm run test:ui` passes;
  `grep -rn "transition-all" src/` returns nothing outside `src/app/lesson` and
  `src/components/lesson`.
- **Feel check**: `npm run dev`, then in DevTools toggle device emulation to a touch phone
  (this makes `hover: hover` false) and reload:
  - tap the monster card's buttons — nothing grows, and nothing stays grown after the
    finger lifts;
  - switch back to desktop and hover the same buttons — the 1.02 scale returns.
- **Done when**: no enlarged control is left latched on a touch device after a tap, and
  `transition-all` is gone from the live surfaces.
