"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const UnitEconomicsBar = () => {
  const currentCost = useGameStore((state) => state.currentCost);
  const promptCount = useGameStore((state) => state.promptCount);
  const latency = useGameStore((state) => state.latency);

  return (
    <div className="bg-[#111928]/75 backdrop-blur-xl border border-white/5 rounded-2xl p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Стоимость API (Запрос)</span>
        <span className="text-emerald-400 font-bold text-lg">${currentCost}</span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Потрачено Лимита (Ученик)</span>
        <span className="font-bold text-lg">{((promptCount * 0.05) / 5 * 100).toFixed(1)}% (${(promptCount * 0.05).toFixed(2)} / $5)</span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Toxicity Filter</span>
        <span className="text-cyan-400 font-bold text-lg">0.00 (Безопасно)</span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Время отклика API</span>
        <span className="font-bold text-lg text-gray-200">{latency}</span>
      </div>
    </div>
  );
};
