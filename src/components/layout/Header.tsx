"use client";

import React from "react";
import { Flame } from "lucide-react";
import { useGameStore } from "@/stores/game";

export const Header = () => {
  const totalXp = useGameStore((state) => state.totalXp);
  const crystals = useGameStore((state) => state.crystals);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-white/5 bg-[var(--color-bg-base)]/80 px-4 py-2.5 backdrop-blur-xl sm:px-8 sm:py-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-extrabold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] sm:h-10 sm:w-10 sm:text-xl">
          M
        </div>
        <span className="max-w-[110px] truncate bg-gradient-to-r from-white to-violet-300 bg-clip-text text-sm font-bold tracking-tight text-transparent sm:max-w-none sm:text-xl">
          MindShift Academy
        </span>
      </div>
      
      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        <div className="hidden items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-sm font-semibold sm:flex">
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
            className="h-1.5 bg-white/10 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-[width] duration-500"
              style={{ width: `${(totalXp / 1000) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-white/5 px-2 py-2 text-sm font-semibold text-amber-400 sm:px-4">
          <span aria-hidden="true">💎</span>
          <span className="tabular-nums" suppressHydrationWarning>
            {crystals}
          </span>
        </div>
      </div>
    </header>
  );
};
