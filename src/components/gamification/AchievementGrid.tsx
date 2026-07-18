"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const AchievementGrid = () => {
  const achievements = useGameStore((state) => state.achievements);

  return (
    <div className="flex flex-col gap-2 flex-grow justify-end">
      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Твои Ачивки</span>
      <div className="grid grid-cols-3 gap-2">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            tabIndex={0}
            aria-label={`${ach.title}: ${ach.desc}${ach.unlocked ? "" : " — ещё не открыто"}`}
            className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-2xl relative group transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              ach.unlocked
                ? "border-amber-400 bg-amber-400/5 shadow-[0_0_10px_rgba(245,158,11,0.15)] opacity-100"
                : "border-white/5 bg-white/5 opacity-30"
            }`}
          >
            <span aria-hidden="true">{ach.emoji}</span>

            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 border border-white/10 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50 shadow-xl">
              <div className="font-bold text-amber-400">{ach.title}</div>
              <div>{ach.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
