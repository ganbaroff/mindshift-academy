/**
 * The product's design tokens, in TypeScript.
 *
 * Why this file exists. Until now the only place a colour was written down was
 * `src/app/globals.css`, which meant nothing could check that a component used it. The same
 * button is written three times with slightly different values, and the retired dark theme's
 * palette (violet #8b5cf6, cyan #06b6d4) survived inside components for a month after the
 * product moved to cream paper — because a CSS file cannot fail a test.
 *
 * This repository has already tried the obvious alternative and lost:
 * `docs/design-handoff/v1.1/03-TOKENS.css` calls itself "Production tokens, copied from
 * src/app/globals.css on 2026-08-07" and has since drifted, because a hand-copied mirror with
 * nothing asserting it is a comment, not a source of truth.
 *
 * So the rule this file creates is the test, not the file: a colour, an easing curve or a
 * duration is declared HERE and in `globals.css`, and `tests/design-tokens.test.mjs` fails the
 * build when the two disagree or when any component writes a raw `#rrggbb` instead.
 * Consistency for every module we build next comes from that test, not from a document
 * somebody has to remember to read.
 *
 * Values are copied from `globals.css` exactly, never re-derived. The motion values in
 * particular are Emil Kowalski's, via plans/001 — do not round them.
 */

/** Colour, keyed by the CSS custom property it mirrors. */
export const COLOR = {
  "--background": "#FBF1E0",
  "--color-bg-base": "#FBF1E0",
  "--foreground": "#2B2320",
  "--ink": "#2B2320",
  "--text-primary": "#2B2320",
  "--text-secondary": "rgba(43, 35, 32, 0.72)",
  "--text-muted": "rgba(43, 35, 32, 0.66)",
  "--surface": "#FFFDF8",
  "--surface-strong": "#F3E4C8",
  "--border-color": "rgba(43, 35, 32, 0.12)",
  "--color-primary": "#FF6B4A",
  "--color-primary-dark": "#E14E30",
  "--color-primary-soft": "#FFB199",
  "--color-primary-violet": "#8B6BFF",
  "--color-secondary": "#1FA398",
  "--color-secondary-dark": "#14776E",
  "--color-secondary-soft": "#9BE3D8",
  "--color-secondary-cyan": "#1FA398",
  "--color-accent": "#FFC93C",
  "--color-accent-dark": "#E0A700",
  "--color-accent-amber": "#E0A700",
  "--color-warning": "#E0A700",
  "--color-success": "#3FB37F",
  "--color-success-dark": "#2A8C61",
  "--color-success-soft": "#B7E4C7",
  "--color-error": "#E14E30",
} as const;

/**
 * Motion. Every animation in the product uses one of these; a new curve or duration is a new
 * product inside the product, so adding one is a decision, not a detail.
 */
export const MOTION = {
  "--ease-out": "cubic-bezier(0.23, 1, 0.32, 1)",
  "--ease-in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
  "--duration-press": "160ms",
} as const;

export type ColorToken = keyof typeof COLOR;
export type MotionToken = keyof typeof MOTION;

/** `token("--color-primary")` -> `"var(--color-primary)"`, typo-checked at compile time. */
export function token(name: ColorToken | MotionToken): string {
  return `var(${name})`;
}
