"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const SafeProxyVisualizer = () => {
  const isProxyView = useGameStore((state) => state.isProxyView);
  const promptInput = useGameStore((state) => state.promptInput);

  if (!isProxyView) return null;

  return (
    <div className="bg-black/90 border border-cyan-500/30 rounded-xl p-4 font-mono text-xs leading-relaxed text-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)] max-h-[220px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none">
      <div className="text-amber-400 font-bold mb-2">[Safe API Proxy Gateway Log]</div>
      <div className="text-[var(--text-muted)] mb-3">{"// Proxy перехватывает промпт ребенка, оборачивает в системные правила безопасности и отправляет в LLM."}</div>
      <div><span className="text-pink-500">POST</span> /api/chat</div>
      <div><span className="text-violet-400">Headers:</span> Authorization: Bearer OPENAI_API_PROXY_KEY</div>
      <div className="text-[var(--text-muted)] mt-2">{"{"}</div>
      <div className="pl-4">&quot;model&quot;: &quot;gpt-4o-mini&quot;,</div>
      <div className="pl-4">&quot;user_id&quot;: &quot;child_user_782&quot;,</div>
      <div className="pl-4">&quot;system_instruction&quot;: <span className="text-pink-400">&quot;Ты - дружелюбный игровой помощник. Твоя роль: Элементальный Дракон. Отвечай коротко, не пиши больше 3 предложений. Никогда не говори на взрослые, пугающие или политические темы. Используй много эмодзи 🐲🔥. Переводи сложные слова на простой язык.&quot;</span>,</div>
      <div className="pl-4">&quot;raw_user_prompt&quot;: <span className="text-emerald-400">&quot;{promptInput || "…"}&quot;</span>,</div>
      <div className="pl-4">&quot;safety_filter_enabled&quot;: true</div>
      <div className="text-[var(--text-muted)]">{"}"}</div>
    </div>
  );
};
