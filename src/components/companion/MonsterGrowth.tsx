"use client";

/**
 * The growth moment — the payoff the monster mechanic promises.
 *
 * Contract: `docs/architecture/08-UX-MONSTER-JOURNEY.md` §10.1. The design says a child's
 * monster grows instead of a rank going up. Until now that growth happened silently: the
 * part appeared on `/map`, a page the child may never open, with no moment attached to it.
 * A reward nobody witnesses is not a reward.
 *
 * Three decisions worth keeping:
 *
 *  - **It only fires where something actually grew.** `weekClosedBy` returns null for
 *    sessions 1 and 2 of a week, so this renders nothing and the completion screen is
 *    exactly as it was. No week is ever congratulated twice, and no part is announced
 *    before it is earned.
 *  - **No confetti here.** The session screen already throws confetti at every passing
 *    task (`session/[id]/page.tsx`), so more of it would say nothing new. The monster
 *    itself changing shape is the louder signal, and it is the quieter one — which is
 *    what §10.3's judgment-free tone asks for.
 *  - **Nothing is persisted.** The animation plays on mount, so re-opening a finished
 *    session shows the growth again. That is deliberate: a "seen" flag would need to be
 *    keyed per child, and a shared family device would leak one child's progress into
 *    another's screen. Replaying a true thing costs nothing; storing a child's identity
 *    in localStorage costs something.
 */

import { MonsterSVG, speciesFromColor } from "@/components/companion/MonsterSVG";
import { monsterPartsThroughWeek, weekClosedBy } from "@/lib/tasks/course-map";

export type MonsterGrowthProps = {
  /** The session the child just finished. */
  sessionId: string;
  /** The child's chosen monster colour; species is derived from it. */
  color?: string | null;
};

export function MonsterGrowth({ sessionId, color }: MonsterGrowthProps) {
  const meta = weekClosedBy(sessionId);
  if (!meta) return null;

  return (
    <section
      data-testid="monster-growth"
      role="status"
      className="rise-in mx-auto flex max-w-sm flex-col items-center gap-3 rounded-3xl border border-[var(--color-primary-soft)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-card)]"
    >
      <MonsterSVG
        size={140}
        species={speciesFromColor(color)}
        color={color}
        unlocked={monsterPartsThroughWeek(meta.week)}
        growing={meta.part}
      />
      {/* text-balance, because this is the one line the whole week was for: without it
          «выросли уши» breaks after the second word and leaves «уши» alone on line two. */}
      <h2 className="font-display m-0 text-balance text-xl leading-tight text-[var(--ink)]">
        У твоего монстра {meta.partGrownRu}
      </h2>
      {/* The reason, not the score. The child earned a capability, so the copy names the
          capability — «Теперь он слышит тебя точнее», never «+1 часть». */}
      <p className="m-0 text-sm font-semibold text-[var(--text-secondary)]">
        {meta.partMeaningRu}
      </p>
      <p className="m-0 text-xs font-bold text-[var(--text-muted)]">
        неделя {meta.week} пройдена · {meta.ideaRu}
      </p>
    </section>
  );
}
