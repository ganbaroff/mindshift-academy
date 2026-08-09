/**
 * The stuck child.
 *
 * Contract: `docs/architecture/08-UX-MONSTER-JOURNEY.md` §10.1 — after two failures on
 * the same task the monster does **not** switch modes, open a modal, or ask whether the
 * child is struggling. All of those say *you are being watched*. It names what it
 * noticed in a message structurally identical to normal feedback, and the hint that was
 * costing five crystals becomes free.
 *
 * Why free matters (02-CURRENT-STATE §"what is broken"): the hint costs 5 crystals and a
 * passed task pays 3, so the child who most needs help is the one who cannot afford it.
 *
 * Pure policy. The *decision* is taken on the server from recorded attempts — a client
 * cannot declare itself stuck and get paid scaffolding for free.
 */

/** Consecutive misses on one task before the monster offers help unprompted. */
export const STUCK_AFTER_FAILURES = 2;

export function isStuckOnTask(failedAttempts: number): boolean {
  return failedAttempts >= STUCK_AFTER_FAILURES;
}

/** A hint is free once the child is stuck; before that it costs what it always cost. */
export function hintCostFor(failedAttempts: number, normalCost: number): number {
  return isStuckOnTask(failedAttempts) ? 0 : normalCost;
}

/**
 * What the monster says. Same shape as any other thing it says — no alert, no modal,
 * no pity. It reports an observation and offers, once.
 */
export function stuckNoticeRu(failedAttempts: number): string | null {
  if (!isStuckOnTask(failedAttempts)) return null;
  if (failedAttempts >= 4) {
    return "Ты пробуешь уже четвёртый раз. Это нормально — задача правда непростая. Подсказка открыта, и её можно взять бесплатно. Можно и вернуться сюда позже.";
  }
  if (failedAttempts === 3) {
    return "Третий раз подряд. Давай я скажу, что бы сделал сам — а ты решишь, согласен или нет. Подсказка сейчас бесплатная.";
  }
  return "Ты пробуешь второй раз подряд. Вот подсказка — сейчас она бесплатная.";
}

/** Label for the hint control, so the price change is visible, not hidden. */
export function hintLabelRu(failedAttempts: number, normalCost: number): string {
  return isStuckOnTask(failedAttempts) ? "бесплатно" : `${normalCost}💎`;
}
