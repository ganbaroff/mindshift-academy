/**
 * Leitner-style spacing for the Возврат step.
 * Correct → longer interval; miss → back to step 0 (due soon).
 */

/** Interval lengths in hours for each step. */
const INTERVAL_HOURS = [0, 24, 72, 168, 336] as const;

export type SpacingState = {
  intervalStep: number;
  nextReviewAt: Date | null;
};

export function spacingAfterOutcome(
  currentStep: number,
  pass: boolean,
  now: Date = new Date()
): SpacingState {
  if (!pass) {
    return { intervalStep: 0, nextReviewAt: now };
  }
  const nextStep = Math.min(currentStep + 1, INTERVAL_HOURS.length - 1);
  const hours = INTERVAL_HOURS[nextStep] ?? 0;
  const nextReviewAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return { intervalStep: nextStep, nextReviewAt };
}

/** True when the concept should appear in Возврат. */
export function isDue(nextReviewAt: Date | null, now: Date = new Date()): boolean {
  if (nextReviewAt == null) return true;
  return nextReviewAt.getTime() <= now.getTime();
}

/**
 * Pick the due concept with the shortest remaining interval (most overdue / step 0 first).
 * Pure: caller supplies the rows.
 */
export function pickReviewConcept(
  rows: { concept: string; intervalStep: number; nextReviewAt: Date | null }[],
  now: Date = new Date()
): string | null {
  const due = rows.filter((r) => isDue(r.nextReviewAt, now));
  if (due.length === 0) return null;
  due.sort((a, b) => {
    if (a.intervalStep !== b.intervalStep) return a.intervalStep - b.intervalStep;
    const at = a.nextReviewAt?.getTime() ?? 0;
    const bt = b.nextReviewAt?.getTime() ?? 0;
    return at - bt;
  });
  return due[0]?.concept ?? null;
}
