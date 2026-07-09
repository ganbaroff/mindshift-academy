"use client";

import React, { useState, useEffect, useRef } from "react";
import { Gift, CheckCircle2, ChevronDown } from "lucide-react";
import { useGameStore } from "@/stores/game";
import { motion, AnimatePresence } from "framer-motion";

interface GachaCalendarProps {
  currentStreak: number;
  lastActive?: Date | string | null;
  onClaimSuccess?: (reward: any) => void;
}

export const GachaCalendar = ({ currentStreak, lastActive, onClaimSuccess }: GachaCalendarProps) => {
  const { crystals, setCrystals } = useGameStore();
  const [claimedDays, setClaimedDays] = useState<number[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<any | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [hasClaimedToday, setHasClaimedToday] = useState(false);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  // Secondary to the lesson itself — collapsed by default so the chat stays the one primary action.
  const [expanded, setExpanded] = useState(false);

  // Map user streak into claimed days in the 7-day cycle
  useEffect(() => {
    const completedDaysCount = currentStreak % 7;
    const completedList = [];
    for (let i = 1; i <= completedDaysCount; i++) {
      completedList.push(i);
    }
    setClaimedDays(completedList);
  }, [currentStreak]);

  // Check if claimed today based on lastActive timestamp
  useEffect(() => {
    if (!lastActive) {
      setHasClaimedToday(false);
      return;
    }
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const isSameDay =
      now.getFullYear() === lastActiveDate.getFullYear() &&
      now.getMonth() === lastActiveDate.getMonth() &&
      now.getDate() === lastActiveDate.getDate();
    setHasClaimedToday(isSameDay);
  }, [lastActive]);

  // When the reward popup opens, move focus into it and allow Escape to dismiss.
  useEffect(() => {
    if (!claimResult) return;
    dialogCloseRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClaimResult(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [claimResult]);

  const handleClaim = async () => {
    setIsClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/gacha/claim", { method: "POST" });
      if (!res.ok) throw new Error("Failed to claim daily reward");
      
      const data = await res.json();
      if (data.success) {
        setClaimResult(data.reward);
        setHasClaimedToday(true);
        
        // Sync local Zustand store
        if (data.reward.type === "crystals") {
          setCrystals((prev) => prev + data.reward.amount);
        }

        // Add current day to claimed list
        const claimedDay = data.nextStreak;
        setClaimedDays((prev) => [...prev, claimedDay]);

        if (onClaimSuccess) {
          onClaimSuccess(data.reward);
        }
      }
    } catch (err) {
      console.error(err);
      setClaimError("Не удалось забрать награду. Попробуй позже!");
    } finally {
      setIsClaiming(false);
    }
  };

  const getRewardName = (reward: any) => {
    if (reward.type === "crystals") {
      return `💎 +${reward.amount} Кристаллов`;
    }
    if (reward.type === "skin_shard") {
      return `🎁 Осколок скина "${reward.itemId}"`;
    }
    return `👑 Скин "${reward.itemId}"`;
  };

  const nextClaimDay = (claimedDays.length % 7) + 1;

  return (
    <div className="rounded-[20px] border border-white/5 bg-surface/60 p-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white/75">
          <Gift className="w-4 h-4 text-violet-400" />
          Календарь наград
          <span className="text-[10px] font-bold bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
            День {claimedDays.length}/7
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <p role="status" aria-live="polite" className="sr-only">
        {isClaiming ? "Собираем награду…" : ""}
      </p>
      {claimError && (
        <p role="alert" className="text-xs font-semibold text-[#D4B4FF]">
          {claimError}
        </p>
      )}

      {!expanded && !hasClaimedToday && !claimedDays.includes(nextClaimDay) && (
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          className="self-start rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/20 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {isClaiming ? "Сбор…" : "🎁 Забрать награду дня"}
        </button>
      )}

      {expanded && (
        <>
          <p className="text-xs text-gray-400">Заходи каждый день и забирай подарки для питомца!</p>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isCollected = claimedDays.includes(day);
          const isCurrent = day === nextClaimDay;
          const isDay7 = day === 7;

          return (
            <div
              key={day}
              className={`rounded-2xl border p-3 flex flex-col items-center justify-between gap-2 text-center relative overflow-hidden transition-transform duration-300 ${
                isCollected
                  ? "bg-cyan-500/5 border-cyan-500/15 text-cyan-400"
                  : isCurrent
                  ? "bg-violet-500/10 border-violet-500/40 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.03]"
                  : "bg-white/[0.02] border-white/5 text-gray-500"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-violet-400 rounded-full animate-ping motion-reduce:animate-none" />
              )}
              
              <span className="text-[10px] font-bold uppercase tracking-wider">День {day}</span>
              
              <div className="text-2xl my-1 flex items-center justify-center">
                {isCollected ? (
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 fill-cyan-400/15" />
                ) : isDay7 ? (
                  "👑"
                ) : day % 3 === 0 ? (
                  "🎁"
                ) : (
                  "💎"
                )}
              </div>

              <span className="text-[9px] font-bold text-gray-400">
                {isCollected ? "Собрано" : isDay7 ? "Супер приз" : "Crystals"}
              </span>
            </div>
          );
        })}
      </div>

          <div className="flex gap-4 items-center mt-1 border-t border-white/5 pt-4">
            <button
              onClick={handleClaim}
              disabled={isClaiming || hasClaimedToday || claimedDays.includes(nextClaimDay)}
              className={`flex-grow font-semibold py-2.5 px-6 rounded-full transition-colors text-xs text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                hasClaimedToday || claimedDays.includes(nextClaimDay)
                  ? "bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-violet-500/10 border border-violet-500/25 text-violet-200 hover:bg-violet-500/20"
              }`}
            >
              {isClaiming
                ? "Сбор…"
                : hasClaimedToday || claimedDays.includes(nextClaimDay)
                ? "Награда собрана"
                : "Получить награду дня"}
            </button>
          </div>
        </>
      )}

      {/* Claim Result Popup */}
      <AnimatePresence>
        {claimResult && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overscroll-contain">
            <button
              type="button"
              aria-label="Закрыть"
              className="absolute inset-0 bg-black/80 cursor-default"
              onClick={() => setClaimResult(null)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="gacha-reward-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111625] border border-white/10 rounded-[32px] p-8 max-w-sm w-full relative z-10 text-center shadow-2xl space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-4xl mx-auto shadow-[0_0_40px_rgba(34,211,238,0.25)]">
                {claimResult.type === "crystals" ? "💎" : "🎁"}
              </div>
              <div className="space-y-2">
                <h3 id="gacha-reward-title" className="text-2xl font-black text-white">Награда получена!</h3>
                <p className="text-sm text-gray-300 font-bold">
                  {getRewardName(claimResult)}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed mt-2">
                  Награда зачислена на твой баланс. Возвращайся завтра за новыми подарками!
                </p>
              </div>
              <button
                ref={dialogCloseRef}
                onClick={() => setClaimResult(null)}
                className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 hover:from-violet-600 hover:to-cyan-500 text-white font-extrabold py-3.5 px-6 rounded-full shadow-lg transition-colors text-sm uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111625]"
              >
                Отлично!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
