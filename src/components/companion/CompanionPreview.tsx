"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const CompanionPreview = () => {
  const activeSkin = useGameStore((state) => state.activeSkin);
  const activeMonsterName = useGameStore((state) => state.activeMonsterName);
  const monsterColor = useGameStore((state) => state.monsterColor);

  return (
    <div className="aspect-square bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
      <div 
        className="absolute w-[180px] h-[180px] rounded-full filter blur-[50px] opacity-20 transition-all duration-500 animate-pulse"
        style={{ background: monsterColor }}
      />
      
      <span className="text-8xl animate-bounce duration-1000 z-10">
        {activeSkin}
      </span>
      
      <span className="mt-4 font-bold text-lg tracking-tight z-10" style={{ color: monsterColor }}>
        {activeMonsterName}
      </span>
    </div>
  );
};
