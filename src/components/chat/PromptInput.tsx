"use client";

import React from "react";
import { Send, Volume2, VolumeX, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useGameStore } from "@/stores/game";
import { Message } from "@/types";
import confetti from "canvas-confetti";
import { useReducedMotion } from "framer-motion";
import { soundEngine } from "@/lib/sound-engine";
import { modalShouldOpen } from "@/lib/progression";

export const PromptInput = () => {
  const {
    promptInput, setPromptInput,
    inputLocked,
    messages, setMessages,
    setPromptCount, setLatency, setCurrentCost,
    activeStepId, activeSkin, activeMonsterName,
    isVoiceActive, setIsVoiceActive,
    setAchievements, updateXP,
    setSteps, setCrystals, setTotalXp, setIsModalOpen, setModalDesc,
    steps, generatedMonster, setIsGeneratingMonster, setGeneratedMonster, monsterColor,
    markLessonCompleted
  } = useGameStore();

  const prefersReducedMotion = useReducedMotion();

  // In-flight guard against double-submit. A ref (not state) so it updates
  // synchronously — two Enter presses fired in the same tick both read the
  // latest value, so the second is rejected before it can open a second
  // /api/chat request (which the server would score as a separate completion
  // and double-award XP/crystals, since each send carries its own eventId).
  const sendingRef = React.useRef(false);

  // Mirror of sendingRef in React state, purely for rendering in-flight feedback
  // on the Send control (spinner + disabled). The ref stays the source of truth
  // for the double-submit guard (it updates synchronously); this state only
  // drives the visual and lags a render behind, which is fine for UI feedback.
  const [isSending, setIsSending] = React.useState(false);

  // SINGLE SOURCE OF TRUTH: the child's XP/crystal totals come from the SERVER
  // (updateUserRewards, returned as `rewardTotals` on the chat response). We set them
  // directly here instead of optimistically incrementing on the client — the old code
  // did BOTH (client bump + server increment), so the shown numbers doubled until the
  // next /api/user refetch. When the server didn't return totals (older response / no
  // award), we leave the counters untouched rather than guess.
  const handleChallengeSuccess = (rewardTotals?: { xp: number; crystals: number } | null) => {
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

    if (rewardTotals) {
      setTotalXp(rewardTotals.xp);
      setCrystals(rewardTotals.crystals);
    }

    // Persist REAL per-lesson completion so the nav list derives lock/unlock
    // from actual progress. Without this, navigating back to an earlier lesson
    // relocked the later ones (they were only "completed" in transient step state).
    markLessonCompleted(activeStepId);

    if (activeStepId === 1) {
      setSteps((prev) => prev.map((s) => s.id === 1 ? { ...s, status: "completed" } : s.id === 2 ? { ...s, status: "active" } : s));
      setModalDesc("Поздравляем! Твой питомец вылупился из яйца благодаря твоим характеристикам. Пришло время научить его говорить!");
      setIsModalOpen(true);
    } else if (activeStepId === 2) {
      setSteps((prev) => prev.map((s) => s.id === 2 ? { ...s, status: "completed" } : s.id === 3 ? { ...s, status: "active" } : s));
      setAchievements((prev) => prev.map((a) => a.id === 2 ? { ...a, unlocked: true } : a));
      setModalDesc("Поздравляем! Ты успешно настроил стиль речи своего ИИ-питомца с помощью точного промпта. Твой дракончик заговорил весело и с огоньком 🔥!");
      setIsModalOpen(true);
    } else if (activeStepId === 3) {
      setSteps((prev) => prev.map((s) => s.id === 3 ? { ...s, status: "completed" } : s.id === 4 ? { ...s, status: "active" } : s));
      setModalDesc("Вау! Ты разблокировал шифровальный код. Теперь твой ИИ-питомец умеет скрывать сообщения по секретному алгоритму!");
      setIsModalOpen(true);
    } else if (activeStepId === 4) {
      setSteps((prev) => prev.map((s) => s.id === 4 ? { ...s, status: "completed" } : s.id === 5 ? { ...s, status: "active" } : s));
      setModalDesc("Отлично! Ты помог монстру исправить ошибку машинного зрения с помощью промпт-тюнинга!");
      setIsModalOpen(true);
    } else if (activeStepId === 5) {
      setSteps((prev) => prev.map((s) => s.id === 5 ? { ...s, status: "completed" } : s));
      setModalDesc("УРА! Вы с питомцем прошли лабиринт-головоломку с помощью продвинутого промпта и условий!");
      setIsModalOpen(true);
    }
  };

  const handleSend = async () => {
    // Guard against the splash-race: while the intro splash is animating the
    // chat is about to be (re)set to the intro message, so a send here would be
    // silently discarded. Read the flag from the store at call-time (not the
    // render-closure) so the guard holds even if a re-render was deferred
    // (e.g. background tab) and the closed-over inputLocked is stale.
    if (useGameStore.getState().inputLocked) return;
    const prompt = promptInput.trim();
    if (!prompt) return;

    // DOUBLE-SUBMIT GUARD: reject a send while one is already in flight. Two
    // rapid Enter presses would otherwise both pass the promptInput check (the
    // "" clear hasn't re-rendered yet) and fire two independent /api/chat
    // requests — each with its own eventId — which the server scores as two
    // separate completions, double-awarding XP/crystals.
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);

    // IDEMPOTENCY: one UUID per send attempt. If this exact request is retried
    // (network stall, double-submit), the server dedups on this id and won't
    // double-award xp/crystals. A new user message gets a fresh id.
    const eventId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

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
          activeMonsterName,
          eventId
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
            utterance.lang = "ru-RU";
            window.speechSynthesis.speak(utterance);
          }
        }
      }

      // CELEBRATION KEYED OFF THE REAL REWARD, NOT THE PEDAGOGY VERDICT: fire the
      // "Задание выполнено" modal + markLessonCompleted ONLY when the server actually
      // GRANTED a reward this turn (rewardTotals != null). Replaying an already-completed
      // lesson returns challengeCompleted=true but rewardTotals=null (the server's anti-farm
      // gate granted nothing) — so no zero-XP "выполнено" popup fires. The tutor's
      // in-character reply is still shown above either way.
      if (modalShouldOpen(data.challengeCompleted, data.rewardTotals)) {
        handleChallengeSuccess(data.rewardTotals);
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
          text: "Что-то пошло не так. Попробуй ещё раз!"
        }
      ]);
    } finally {
      // Release the in-flight guard once this send fully settles (success or
      // error), so the next legitimate message can be sent.
      sendingRef.current = false;
      setIsSending(false);
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
      // Branded, shame-free error via the in-app modal (same pattern as the reward modal)
      // instead of a blocking native popup that breaks the game's look and motion-safety.
      setModalDesc("Ой, карточка не оживилась с первого раза 🐲. Это не твоя вина — проверь интернет и попробуй ещё раз!");
      setIsModalOpen(true);
    } finally {
      setIsGeneratingMonster(false);
    }
  };

  const toggleVoice = () => {
    const nextVoice = !isVoiceActive;
    setIsVoiceActive(nextVoice);
    if (nextVoice) {
      setAchievements((prev) => prev.map((a) => a.id === 3 ? { ...a, unlocked: true } : a));
      updateXP(50);
      soundEngine.play("success");
      setModalDesc("Голосовая озвучка включена! Твой питомец теперь говорит вслух. +50 XP");
      setIsModalOpen(true);
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
      <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[var(--color-accent)] border-2 border-dashed border-amber-500/40 text-center">
        <h3 className="font-extrabold text-lg text-amber-500 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-amber-500 fill-amber-500/20" /> Все задания выполнены!
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Твой ИИ-питомец {activeMonsterName} полностью настроен. Давай создадим его постоянную цифровую карточку!
        </p>
        <button 
          onClick={handleGenerateMonster}
          className="w-full transform rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg transition-[transform,box-shadow,background-color] [@media(hover:hover)]:hover:scale-[1.02] hover:bg-[var(--color-primary-violet)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
        <span>Защита включена: взрослый контент фильтруется автоматически</span>
      </div>
      
      <textarea
        name="lessonPrompt"
        value={promptInput}
        onChange={(e) => setPromptInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={inputLocked}
        autoComplete="off"
        aria-disabled={inputLocked}
        aria-label="Напиши промпт для питомца"
        placeholder={
          activeStepId === 1
            ? "Напиши 3 качества монстра, чтобы оживить его… (например: 'храбрый, быстрый, весёлый')"
            : activeStepId === 2
            ? "Напиши промпт для дракончика… (например: 'Пой весело и добавляй огонёк 🔥 к каждому слову')"
            : activeStepId === 3
            ? "Напиши правило секретного кода… (например: 'Заменяй все гласные буквы на звездочки *')"
            : activeStepId === 4
            ? "Исправь зрение монстра… (например: 'Это не кошка, это собака!')"
            : "Помоги дракончику пройти лабиринт! Напиши промпт с условием… (например: 'Если впереди стена, то поверни налево')"
        }
        className="h-20 w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-3 text-sm text-[var(--ink)] placeholder-gray-500 transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:border-violet-500 focus-visible:ring-1 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      />

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
          <button
            onClick={toggleVoice}
            type="button"
            aria-pressed={isVoiceActive}
            aria-label={isVoiceActive ? "Выключить озвучку ответов" : "Включить озвучку ответов"}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-[colors,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isVoiceActive
                ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                : "bg-[var(--surface-strong)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--ink)]"
            }`}
            title="Включить озвучку ответов роботом"
          >
            {isVoiceActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <span>Нажми Enter для отправки</span>
        </div>
        
        <button
          onClick={handleSend}
          type="button"
          disabled={inputLocked || isSending}
          aria-busy={isSending}
          className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 font-bold text-white shadow-lg shadow-violet-500/20 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-[var(--color-primary-violet)] hover:shadow-violet-500/30 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <span>{isSending ? "Отправка…" : "Отправить промпт"}</span>
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
