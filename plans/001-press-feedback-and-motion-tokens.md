# 001 — Give pressable controls press feedback, on shared motion tokens

- **Status**: DONE (applied and browser-verified 2026-08-09)
- **Commit**: e840c60
- **Severity**: HIGH
- **Category**: Physicality & origin (§3) + Cohesion & tokens (§7)
- **Estimated scope**: 2 files (globals.css, session page), ~15 lines

## Problem

Exactly one control in the entire product has press feedback. Everything a child
actually presses — most of all «Проверить», the single most-pressed control in the app,
touched 5–6 times per task across 81 tasks — responds to a tap with nothing at all. On a
cheap Android phone with a slow network, the press is the only instant confirmation the
device heard them; without it the app feels dead until the server answers.

```tsx
/* src/app/session/[id]/page.tsx:954 — current, the primary action */
className="relative z-10 min-h-11 w-full flex-1 rounded-2xl bg-violet-500 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
```

The only element that does have it is the legacy chat send button:

```tsx
/* src/components/chat/PromptInput.tsx:345 — the lone exemplar */
transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 active:translate-y-0
```

There is also nowhere to put a curve: `src/app/globals.css` contains zero `@keyframes`,
zero `cubic-bezier`, and no `--ease-*` or `--duration-*` tokens. Every transition in the
codebase therefore rides Tailwind's default `ease`, which §2 calls too weak for
deliberate motion.

## Target

Add motion tokens next to the existing colour tokens, then use them for press feedback.

```css
/* target — src/app/globals.css, inside the existing :root block */
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--duration-press: 160ms;
```

```tsx
/* target — src/app/session/[id]/page.tsx:954, appended to the existing className */
transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97]
```

`scale(0.97)` and `160ms` are the exact values from AUDIT.md §3 ("press feedback:
`transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`").
Do not round them.

## Repo conventions to follow

- CSS custom properties live in the `:root` block of `src/app/globals.css:3`, next to
  `--color-bg-base`. Tailwind v4 is CSS-first — there is no `tailwind.config.js`.
- Arbitrary values use Tailwind bracket syntax, as in `min-h-[calc(...)]` already used in
  this file.
- Exemplar to imitate for the transition property list: `src/components/chat/PromptInput.tsx:345`.

## Steps

1. In `src/app/globals.css`, inside the existing `:root { … }` block that starts at line 3,
   add the three custom properties from **Target** verbatim.
2. In `src/app/session/[id]/page.tsx:954`, append to the existing `className` string:
   `transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97]`.
   Change nothing else on that element.
3. Apply the identical class fragment to the skip/advance button at
   `src/app/session/[id]/page.tsx` (the `showAdvance` button, `advanceLabel`), and to the
   hint button in the same sticky footer.
4. Apply it to `src/components/support/ReportProblemButton.tsx` on the main button
   (`data-testid="report-problem"`) and on `data-testid="report-problem-send"`.

## Boundaries

- Do NOT touch `src/app/lesson/**` — the legacy island is deliberately frozen.
- Do NOT change markup, structure, copy, or any colour.
- Do NOT add dependencies. No framer-motion here: this is a CSS transition.
- `active:scale-*` needs no `prefers-reduced-motion` guard — a 3% press scale is feedback,
  not travel, and §6 says reduced motion means gentler, not zero.
- If line 954 no longer matches the excerpt above, STOP and report drift.

## Verification

- **Mechanical**: `npx tsc --noEmit` → no errors; `npm run lint` → no issues;
  `npm test` → all suites pass (the a11y gate asserts the 44px target, which `min-h-11`
  still provides).
- **Feel check**: `npm run dev`, open `/session/w1-s1`, press and hold «Проверить»:
  - the button shrinks slightly and *stays* shrunk while held, springing back on release;
  - it never moves position — only scale changes, so the sticky bar does not reflow;
  - in DevTools Animations panel at 10% speed, the shrink starts fast and settles slowly
    (that is `--ease-out`), not the reverse;
  - with `prefers-reduced-motion: reduce` set in the Rendering panel, the press feedback
    remains — this is intentional.
- **Done when**: every button in the sticky footer and the report control visibly responds
  to touch within one frame, and `npm test` is green.
