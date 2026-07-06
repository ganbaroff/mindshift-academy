"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const GeneratingOverlay = () => {
  const isGeneratingMonster = useGameStore((state) => state.isGeneratingMonster);
  const activeSkin = useGameStore((state) => state.activeSkin);
  const activeMonsterName = useGameStore((state) => state.activeMonsterName);

  if (!isGeneratingMonster) return null;

  return (
    <div className="fixed inset-0 z-[1050] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 border-r-cyan-400 border-b-violet-500 border-l-transparent animate-spin motion-reduce:animate-none duration-1000" />
        <span className="text-4xl animate-pulse motion-reduce:animate-none">{activeSkin}</span>
      </div>
      <h3 className="font-extrabold text-xl text-white mt-8 tracking-wide">Магия ИИ в процессе...</h3>
      <p className="text-gray-400 text-sm mt-2 max-w-xs text-center leading-relaxed">
        DALL-E генерирует уникальное 3D-изображение твоего питомца <strong>{activeMonsterName}</strong>. Подожди немного!
      </p>
    </div>
  );
};
