"use client";

import React from "react";
import { Flame } from "lucide-react";
import { useGameStore } from "@/stores/game";

export const Header = () => {
  const totalXp = useGameStore((state) => state.totalXp);
  const crystals = useGameStore((state) => state.crystals);

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center font-extrabold text-white text-xl shadow-[0_0_20px_rgba(139,92,246,0.3)]">
          M
        </div>
        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-violet-300 bg-clip-text text-transparent">
          MindShift Academy
        </span>
      </div>
      
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-4 py-2 text-sm font-semibold">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Серия</span>
        </div>
        
        <div className="flex flex-col gap-1 w-[150px]">
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

        <div className="flex items-center gap-2 bg-white/5 border border-amber-500/20 rounded-full px-4 py-2 text-sm font-semibold text-amber-400">
          <span aria-hidden="true">💎</span>
          <span className="tabular-nums" suppressHydrationWarning>
            {crystals}
          </span>
        </div>
      </div>
    </header>
  );
};
