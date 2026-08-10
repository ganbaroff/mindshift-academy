"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

// Dollar amounts stay $-prefixed (en-US) to match the design; percent keeps a dot decimal.
const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 5,
});
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const SPEND_LIMIT = 5;
const COST_PER_PROMPT = 0.05;

export const UnitEconomicsBar = () => {
  const currentCost = useGameStore((state) => state.currentCost);
  const promptCount = useGameStore((state) => state.promptCount);
  const latency = useGameStore((state) => state.latency);

  const spent = promptCount * COST_PER_PROMPT;
  const spentFraction = spent / SPEND_LIMIT;

  return (
    <div className="bg-[#111928]/75 backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-4 md:p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Стоимость API (Запрос)</span>
        <span className="text-emerald-400 font-bold text-lg tabular-nums">{usdPrecise.format(currentCost)}</span>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Потрачено Лимита (Ученик)</span>
        <span className="font-bold text-lg tabular-nums break-words">{percent.format(spentFraction)} ({usd.format(spent)} / {usd.format(SPEND_LIMIT)})</span>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Toxicity Filter</span>
        <span className="text-cyan-400 font-bold text-lg tabular-nums">0.00 (Безопасно)</span>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Время отклика API</span>
        <span className="font-bold text-lg text-[var(--text-primary)] tabular-nums">{latency}</span>
      </div>
    </div>
  );
};
