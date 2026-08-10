"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { useGameStore } from "@/stores/game";
import { classifySurface } from "@/lib/problem-report";

export const Header = () => {
  const totalXp = useGameStore((state) => state.totalXp);
  const crystals = useGameStore((state) => state.crystals);
  /**
   * Two names, one product. A child is here to meet a creature, so the bar says
   * «Зверёныш»; a parent is here to run a school, so it says MindShift Academy. Legal
   * copy, e-mail and the consent flow keep the company name regardless — this is the
   * child's word for the thing, not a rebrand of the entity.
   *
   * The child/parent split reuses `classifySurface`, so there is exactly one list of
   * child routes in the codebase and the header can never disagree with the feedback
   * button about where the child is.
   */
  const isChild = classifySurface(usePathname() ?? "/") === "child";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--color-bg-base)]/80 px-4 py-2.5 backdrop-blur-xl sm:px-8 sm:py-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-lg font-extrabold text-white sm:h-10 sm:w-10 sm:text-xl">
          {isChild ? "З" : "M"}
        </div>
        {/* Was a white→violet gradient clipped to the text, which on cream paper rendered
            as nothing at all. Solid ink, and the display face. */}
        <span className="font-display max-w-[140px] truncate text-sm font-bold tracking-tight text-[var(--ink)] sm:max-w-none sm:text-xl">
          {isChild ? "Зверёныш" : "MindShift Academy"}
        </span>
      </div>
      
      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        <div className="hidden items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-semibold sm:flex">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Серия</span>
        </div>
        
        <div className="hidden w-[150px] flex-col gap-1 sm:flex">
          <div className="flex justify-between text-[11px] font-bold text-gray-400">
            <span>Уровень 2</span>
            <span className="tabular-nums">{totalXp} / 1000 XP</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={totalXp}
            aria-valuemin={0}
            aria-valuemax={1000}
            aria-label="Прогресс до следующего уровня"
            className="h-1.5 bg-[var(--surface-strong)] rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-[width] duration-500"
              style={{ width: `${(totalXp / 1000) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-[var(--surface-strong)] px-2 py-2 text-sm font-semibold text-amber-400 sm:px-4">
          <span aria-hidden="true">💎</span>
          <span className="tabular-nums" suppressHydrationWarning>
            {crystals}
          </span>
        </div>
      </div>
    </header>
  );
};
