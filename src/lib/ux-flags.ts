/**
 * UX v1.1 feature gate.
 *
 * Contract: `docs/architecture/08-UX-MONSTER-JOURNEY.md` §6 — the new child-facing
 * mechanics ship behind `NEXT_PUBLIC_UX_V11`, off by default, until step 6 turns it on.
 * Step 6's precondition is non-negotiable: `test:e2e:current-sessions` must run in CI.
 * Today `verify:release` only drives the legacy `/lesson` route, which is how a broken
 * retry button once shipped green.
 *
 * What this gate covers: the re-ask and the unprompted free hint for a stuck child —
 * behaviour a child would meet that no e2e suite exercises yet.
 *
 * What it deliberately does NOT cover, and why:
 *  - `/continue` and the entry points that now use it. That is defect 2 (§1), a plain
 *    bug: a returning child restarting at step 1. Hiding a bug fix behind a design flag
 *    keeps the bug.
 *  - The task brief. It renders only for tasks whose content carries `goalRu` /
 *    `givenRu` / `doneWhenRu`, so the content is its own gate — an unbriefed session
 *    looks exactly as it does today.
 */
export function uxV11Enabled(): boolean {
  return process.env.NEXT_PUBLIC_UX_V11 === "1";
}
