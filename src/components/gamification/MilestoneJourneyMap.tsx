"use client";

import React from "react";
import { WEEKLY_COSMETICS, SESSION_TIER_CRYSTALS } from "@/lib/milestone-chest";

type Props = {
  /** Weeks 1..5 already completed (3/3 sessions). */
  completedWeeks?: number[];
  className?: string;
};

/**
 * Journey map — repurposed from daily GachaCalendar.
 * Shows fixed, pre-announced weekly cosmetics and session crystal tiers.
 * No claim button, no randomness, no daily-login streak UI.
 */
export function MilestoneJourneyMap({ completedWeeks = [], className }: Props) {
  const done = new Set(completedWeeks);

  return (
    <section
      className={className}
      data-testid="milestone-journey-map"
      aria-labelledby="journey-map-title"
    >
      <h2 id="journey-map-title" className="text-lg font-semibold text-white mb-2">
        Карта пути
      </h2>
      <p className="text-sm text-white/70 mb-4">
        Награды известны заранее: за сессию — {SESSION_TIER_CRYSTALS[1]}/
        {SESSION_TIER_CRYSTALS[2]}/{SESSION_TIER_CRYSTALS[3]} кристаллов по тиру; за неделю —
        именной предмет.
      </p>
      <ol className="space-y-3">
        {WEEKLY_COSMETICS.map((c) => {
          const earned = done.has(c.week);
          return (
            <li
              key={c.itemId}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-violet-300 font-mono text-sm w-8 shrink-0">
                Н{c.week}
              </span>
              <div className="min-w-0">
                <p className="text-white font-medium">{c.nameRu}</p>
                <p className="text-xs text-white/60">
                  {earned ? "Получено" : "Ждёт на недельной вехе"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** @deprecated Use MilestoneJourneyMap — gacha calendar removed. */
export { MilestoneJourneyMap as GachaCalendar };
