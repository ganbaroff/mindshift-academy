"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const MonsterCard = () => {
  const generatedMonster = useGameStore((state) => state.generatedMonster);
  const setGeneratedMonster = useGameStore((state) => state.setGeneratedMonster);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [copyNotice, setCopyNotice] = React.useState("");

  // Keyboard access: Escape dismisses the certificate, Tab is trapped inside the
  // dialog so keyboard/screen-reader users can't wander behind the overlay.
  React.useEffect(() => {
    if (!generatedMonster) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Move focus into the dialog on open.
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setGeneratedMonster(null);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [generatedMonster, setGeneratedMonster]);

  const handleResetApp = async () => {
    const confirmed = window.confirm(
      "Начать новое приключение? Весь твой прогресс сбросится, и ты начнёшь обучение с самого начала."
    );
    if (!confirmed) return;
    try {
      await fetch("/api/reset", {
        method: "POST"
      });
      window.location.reload();
    } catch (err) {
      console.error("Reset failed:", err);
      window.location.reload(); // Hard reload as fallback
    }
  };

  if (!generatedMonster) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/95 flex items-center justify-center p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-500 motion-reduce:animate-none">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="monster-card-title"
        tabIndex={-1}
        className="bg-[#0d1527] border border-white/10 rounded-3xl p-6 md:p-8 max-w-[480px] w-full text-center relative shadow-[0_0_50px_rgba(139,92,246,0.2)] outline-none"
      >

        {/* Holographic Header */}
        <div className="text-[10px] font-extrabold tracking-widest text-violet-400 uppercase mb-2">Цифровой сертификат выпускника</div>
        
        {/* Card Body representation */}
        <div className="border border-white/10 bg-black/30 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden group">
          <div 
            className="absolute w-[200px] h-[200px] rounded-full filter blur-[60px] opacity-35 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{ background: generatedMonster.color }}
          />
          
          {/* Monster Image */}
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 relative">
            <img
              src={generatedMonster.imageUrl}
              alt={generatedMonster.name}
              width={1024}
              height={1024}
              loading="lazy"
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
            />
          </div>

          {/* Title & Emoji */}
          <div className="flex justify-between items-center z-10 px-1">
            <div className="text-left">
              <h2 id="monster-card-title" className="font-extrabold text-xl text-white">{generatedMonster.name}</h2>
              <span className="text-[11px] font-bold text-cyan-400">Уровень 3 • ИИ-Партнер</span>
            </div>
            <span className="text-4xl" aria-hidden="true">{generatedMonster.emoji}</span>
          </div>

          {/* Stats visualization */}
          <div className="grid grid-cols-3 gap-2 bg-white/5 border border-white/5 rounded-xl p-3 z-10 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px] uppercase">Сила</span>
              <span className="font-extrabold text-amber-500">85 / 100</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px] uppercase">Интеллект</span>
              <span className="font-extrabold text-cyan-400">98 / 100</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px] uppercase">Логика</span>
              <span className="font-extrabold text-emerald-400">100 / 100</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-6">
          <div className="flex gap-3">
            <a 
              href={generatedMonster.imageUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex-1 bg-white text-black font-extrabold py-3 rounded-full text-sm hover:bg-gray-200 hover:scale-[1.02] transform transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span aria-hidden="true">📥</span> Открыть / Скачать
            </a>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `Посмотри на моего ИИ-монстра ${generatedMonster.name} в MindShift Academy! 👾`
                  );
                  setCopyNotice("Описание монстра скопировано в буфер обмена!");
                } catch {
                  setCopyNotice("Не получилось скопировать. Попробуй ещё раз.");
                }
              }}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-extrabold py-3 border border-white/10 rounded-full text-sm hover:scale-[1.02] transform transition-all cursor-pointer"
            >
              <span aria-hidden="true">🔗</span> Поделиться
            </button>
          </div>

          <p aria-live="polite" className="min-h-[1rem] text-xs text-violet-300">
            {copyNotice}
          </p>

          <button
            onClick={handleResetApp}
            className="self-center text-xs font-semibold text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors cursor-pointer mt-1"
          >
            Начать новое приключение?
          </button>
        </div>
        
      </div>
    </div>
  );
};
