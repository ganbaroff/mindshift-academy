"use client";

import React from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { useGameStore } from "@/stores/game";

export const Syllabus = () => {
  const steps = useGameStore((state) => state.steps);
  const activeStepId = useGameStore((state) => state.activeStepId);
  const setActiveStepId = useGameStore((state) => state.setActiveStepId);
  const [gateMessage, setGateMessage] = React.useState("");

  const handleSelectStep = (stepId: number) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    if (stepId === 3 && steps.find(s => s.id === 2)?.status !== "completed") {
      setGateMessage("Сначала закончи Шаг 2 — и этот шаг откроется!");
      return;
    }

    setGateMessage("");
    setActiveStepId(stepId);
  };

  return (
    <div className="bg-[#111928]/75 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <h2 className="font-bold text-lg">Модуль 1: Мой первый питомец</h2>
        <span className="text-cyan-400 text-sm font-semibold">Шаг {activeStepId} из 3</span>
      </div>
      
      <p className="text-gray-400 text-xs leading-relaxed">
        Мы настраиваем ИИ-ассистента, с которым ты будешь учиться дальше. Преврати его в монстра с помощью промпта!
      </p>
      
      {gateMessage && (
        <p role="status" aria-live="polite" className="text-xs font-semibold text-amber-400">
          {gateMessage}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {steps.map(step => (
          <button
            key={step.id}
            type="button"
            onClick={() => handleSelectStep(step.id)}
            aria-current={step.id === activeStepId ? "step" : undefined}
            className={`flex items-start gap-4 p-4 rounded-xl border text-left w-full transition-[transform,opacity,background-color] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111928] ${
              step.status === "completed"
                ? "bg-white/5 border-white/5 opacity-80"
                : step.status === "active" && step.id === activeStepId
                ? "bg-violet-500/10 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                : "bg-white/5 border-white/5"
            }`}
          >
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border ${
              step.status === "completed" 
                ? "bg-emerald-500 border-emerald-500" 
                : "border-white/15"
            }`}>
              {step.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-white fill-emerald-500" />
              ) : step.status === "locked" ? (
                <Lock className="w-3 h-3 text-gray-500" />
              ) : null}
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className={`text-sm font-semibold ${step.status === "completed" ? "line-through text-gray-500" : "text-white"}`}>
                {step.name}
              </span>
              <span className="text-[11px] font-bold text-amber-500">{step.xp}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
