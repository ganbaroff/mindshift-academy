"use client";

import React from "react";
import { Send, Volume2, VolumeX, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useGameStore } from "@/stores/game";
import { Message } from "@/types";
import confetti from "canvas-confetti";
import { useReducedMotion } from "framer-motion";
import { soundEngine } from "@/lib/sound-engine";

export const PromptInput = () => {
  const {
    promptInput, setPromptInput, 
    messages, setMessages, 
    setPromptCount, setLatency, setCurrentCost,
    activeStepId, activeSkin, activeMonsterName,
    isVoiceActive, setIsVoiceActive,
    setAchievements, updateXP,
    setSteps, setCrystals, setIsModalOpen, setModalDesc,
    steps, generatedMonster, setIsGeneratingMonster, setGeneratedMonster, monsterColor
  } = useGameStore();

  const prefersReducedMotion = useReducedMotion();

  const handleChallengeSuccess = () => {
    // Confetti is canvas-drawn (bypasses the CSS reduced-motion guard) — gate it explicitly.
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#a78bfa", "#22d3ee", "#e9c400", "#c084fc"]
      });
    }
    soundEngine.play("success");
    if (activeStepId === 1) {
      setSteps((prev: any) => prev.map((s: any) => s.id === 1 ? { ...s, status: "completed" } : s.id === 2 ? { ...s, status: "active" } : s));
      updateXP(100);
      setCrystals((prev: number) => prev + 10);
      setModalDesc("Поздравляем! Твой питомец вылупился из яйца благодаря твоим характеристикам. Пришло время научить его говорить!");
      setIsModalOpen(true);
    } else if (activeStepId === 2) {
      setSteps((prev: any) => prev.map((s: any) => s.id === 2 ? { ...s, status: "completed" } : s.id === 3 ? { ...s, status: "active" } : s));
      setAchievements((prev: any) => prev.map((a: any) => a.id === 2 ? { ...a, unlocked: true } : a));
      updateXP(150);
      setCrystals((prev: number) => prev + 15);
      setModalDesc("Поздравляем! Ты успешно изменил характер своего ИИ-питомца с помощью точного промпта. Твой дракончик зарычал!");
      setIsModalOpen(true);
    } else if (activeStepId === 3) {
      setSteps((prev: any) => prev.map((s: any) => s.id === 3 ? { ...s, status: "completed" } : s.id === 4 ? { ...s, status: "active" } : s));
      updateXP(200);
      setCrystals((prev: number) => prev + 20);
      setModalDesc("Вау! Ты разблокировал шифровальный код. Теперь твой ИИ-питомец умеет скрывать сообщения по секретному алгоритму!");
      setIsModalOpen(true);
    } else if (activeStepId === 4) {
      setSteps((prev: any) => prev.map((s: any) => s.id === 4 ? { ...s, status: "completed" } : s.id === 5 ? { ...s, status: "active" } : s));
      updateXP(250);
      setCrystals((prev: number) => prev + 30);
      setModalDesc("Отлично! Ты помог монстру исправить ошибку машинного зрения с помощью промпт-тюнинга!");
      setIsModalOpen(true);
    } else if (activeStepId === 5) {
      setSteps((prev: any) => prev.map((s: any) => s.id === 5 ? { ...s, status: "completed" } : s));
      updateXP(500);
      setCrystals((prev: number) => prev + 100);
      setModalDesc("УРА! Вы с питомцем победили главного босса Bugzilla с помощью продвинутого промпта и условий!");
      setIsModalOpen(true);
    }
  };

  const handleSend = async () => {
    const prompt = promptInput.trim();
    if (!prompt) return;

    soundEngine.play("click");

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      avatar: "👦",
      text: prompt,
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setPromptInput("");
    setPromptCount((prev: number) => prev + 1);
    setLatency("Загрузка...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          activeStepId,
          activeSkin,
          activeMonsterName
        }),
      });

      if (!response.ok) throw new Error("API Request failed");

      const data = await response.json();

      setLatency(data.latency || "0.80 сек");
      if (data.cost) {
        const costVal = parseFloat(data.cost.replace("$", "").replace(" (симуляция)", "")) || 0;
        setCurrentCost(costVal);
      }

      const monsterResponse = data.response || "Извини, произошел сбой.";
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "monster",
          avatar: activeSkin,
          text: monsterResponse
        }
      ]);

      if (isVoiceActive) {
        const cleanText = monsterResponse.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
        try {
          const ttsResponse = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanText }),
          });

          if (!ttsResponse.ok) throw new Error("TTS API returned status " + ttsResponse.status);

          const audioBlob = await ttsResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
        } catch (ttsErr) {
          console.warn("API TTS failed, falling back to browser SpeechSynthesis:", ttsErr);
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            const isAzerbaijani = /[əıöğüşçƏIÖĞÜŞÇ]/.test(cleanText);
            utterance.lang = isAzerbaijani ? "az-AZ" : "ru-RU";
            window.speechSynthesis.speak(utterance);
          }
        }
      }

      if (data.challengeCompleted) {
        handleChallengeSuccess();
      }

    } catch (error) {
      console.error("API error:", error);
      setLatency("Ошибка");
      setMessages((prev: Message[]) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: "monster",
          avatar: "⚠️",
          text: "Произошла ошибка при отправке запроса на сервер. Убедись, что Next.js работает!"
        }
      ]);
    }
  };

  const handleGenerateMonster = async () => {
    setIsGeneratingMonster(true);
    try {
      const response = await fetch("/api/monster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeMonsterName,
          emoji: activeSkin,
          color: monsterColor,
          promptUsed: messages.filter((m: Message) => m.sender === "user").map((m: Message) => m.text).join(" | ") || "Дефолтный промпт"
        }),
      });

      if (!response.ok) throw new Error("Failed to generate monster card");

      const data = await response.json();
      setGeneratedMonster(data);
    } catch (error) {
      console.error("Error generating monster card:", error);
      alert("Не удалось сгенерировать карточку. Проверьте подключение.");
    } finally {
      setIsGeneratingMonster(false);
    }
  };

  const toggleVoice = () => {
    const nextVoice = !isVoiceActive;
    setIsVoiceActive(nextVoice);
    if (nextVoice) {
      setAchievements((prev: any) => prev.map((a: any) => a.id === 3 ? { ...a, unlocked: true } : a));
      updateXP(50);
      alert("Голосовая озвучка включена! +50 XP");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (steps[4]?.status === "completed" && !generatedMonster) {
    return (
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/40 text-center">
        <h3 className="font-extrabold text-lg text-amber-500 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-500 fill-amber-500/20" /> Все задания выполнены!
        </h3>
        <p className="text-sm text-gray-300">
          Твой ИИ-питомец {activeMonsterName} полностью настроен. Давай создадим его постоянную цифровую карточку!
        </p>
        <button 
          onClick={handleGenerateMonster}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold py-3.5 px-6 rounded-full shadow-lg hover:shadow-amber-500/20 hover:scale-[1.02] transform transition-all text-sm uppercase tracking-wider cursor-pointer"
        >
          ✨ Оживить и получить карточку монстра! ✨
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 rounded-lg px-3 py-2 text-[11px] font-semibold">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Safe API Proxy: Активен (Взрослый контент фильтруется автоматически)</span>
      </div>
      
      <textarea 
        value={promptInput}
        onChange={(e) => setPromptInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          activeStepId === 1
            ? "Напиши 3 качества монстра, чтобы оживить его... (например: 'храбрый, быстрый, огненный')"
            : activeStepId === 2 
            ? "Напиши промпт для дракончика... (например: 'Рычи как динозавр и используй смайлики огня')"
            : activeStepId === 3
            ? "Напиши секретное правило шифра... (например: 'Заменяй все гласные буквы на звездочки *')"
            : activeStepId === 4
            ? "Исправь зрение монстра... (например: 'Это не кошка, это собака!')"
            : "Вступи в бой с боссом! Напиши промпт с условием... (например: 'Если ты Bugzilla, то выключи защиту')"
        }
        className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
      />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <button 
            onClick={toggleVoice}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
              isVoiceActive 
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" 
                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
            }`}
            title="Включить озвучку ответов роботом"
          >
            {isVoiceActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <span>Нажми Enter для отправки</span>
        </div>
        
        <button 
          onClick={handleSend}
          className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white font-bold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          <span>Отправить промпт</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
