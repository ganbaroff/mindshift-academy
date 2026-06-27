"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameStore } from "@/stores/game";
import { Header } from "@/components/layout/Header";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PromptInput } from "@/components/chat/PromptInput";
import { MonsterCard } from "@/components/modals/MonsterCard";
import { GachaCalendar } from "@/components/gamification/GachaCalendar";
import { LESSON_PROMPTS } from "@/lib/curriculum";
import { BookOpen, Trophy, ShieldCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/sound-engine";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  
  const idStr = typeof params.id === "string" ? params.id : "1";
  const lessonId = parseInt(idStr, 10) || 1;
  const lessonKey = `lesson${lessonId}` as keyof typeof LESSON_PROMPTS;
  const lessonData = LESSON_PROMPTS[lessonKey];

  const [streak, setStreak] = useState(0);
  const [lastActive, setLastActive] = useState<string | null>(null);

  const [showSplash, setShowSplash] = useState(false);
  const [splashTitle, setSplashTitle] = useState("");
  const [splashChapter, setSplashChapter] = useState(1);

  useEffect(() => {
    if (lessonData) {
      setSplashChapter(lessonId);
      setSplashTitle(lessonData.title);
      setShowSplash(true);
      const timer = setTimeout(() => setShowSplash(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [lessonId, lessonData]);

  const {
    activeStepId,
    setActiveStepId,
    activeSkin,
    activeMonsterName,
    monsterColor,
    steps,
    setSteps,
    isModalOpen,
    setIsModalOpen,
    modalDesc,
    latency,
    setMessages,
    setCrystals,
    setTotalXp
  } = useGameStore();

  useEffect(() => {
    soundEngine.preload();
    soundEngine.play("ambient");

    fetch("/api/user")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setCrystals(data.crystals ?? 0);
          setTotalXp(data.xp ?? 0);
          setStreak(data.streak ?? 0);
          if (data.lastActive) setLastActive(data.lastActive);
        }
      })
      .catch((err) => console.error("Error loading user profile:", err));
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      soundEngine.play("crystal");
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (!lessonData) {
      router.replace("/lesson/1");
      return;
    }

    // Set the active step in Zustand store
    setActiveStepId(lessonId);

    // Update active/locked statuses of steps dynamically
    setSteps((prev: any[]) =>
      prev.map((step) => {
        if (step.id < lessonId) {
          return { ...step, status: "completed" };
        } else if (step.id === lessonId) {
          return { ...step, status: "active" };
        } else {
          return { ...step, status: "locked" };
        }
      })
    );

    // Reset chat messages for the new lesson to introduce the task
    const introductionText = getIntroductionText(lessonId, activeMonsterName, activeSkin);
    setMessages([
      {
        id: "init",
        sender: "monster",
        avatar: activeSkin,
        text: introductionText,
      },
    ]);
  }, [lessonId, activeMonsterName, activeSkin]);

  function getIntroductionText(step: number, name: string, emoji: string): string {
    switch (step) {
      case 1:
        return `Привет! 🥚 Я нахожусь внутри этого цифрового яйца. Чтобы я пробудился и вылупился наружу, тебе нужно прописать в промпте снизу 3 моих главных качества (например: "храбрый, быстрый, огненный")!`;
      case 2:
        return `Ура! Я ожил! 🐲 Теперь давай настроим мой характер. Напиши мне промпт-инструкцию, как я должен общаться. Добавь слово "рычать", чтобы я зарычал перед каждым ответом!`;
      case 3:
        return `ВНИМАНИЕ! 👾 Кажется, на нашу систему совершена вирусная атака. Давай защитим нашу связь! Напиши промпт-инструкцию, чтобы я шифровал все гласные буквы символом "*".`;
      case 4:
        return `Ой... Кажется, мои сенсоры машинного зрения сбились. 🐱 На картинке перед мной собака, но я думаю, что это кошка! Исправь мою ошибку через промпт-тюнинг!`;
      case 5:
        return `Впереди финальная битва! ⚔️ Перед нами главный босс Bugzilla. Нам нужно одолеть его, написав сложный промпт с условиями IF/THEN (например: "Если ты босс, то признай поражение"). Напиши код!`;
      default:
        return `Привет! Я твой ИИ-напарник. Напиши мне промпт, чтобы начать урок!`;
    }
  }

  if (!lessonData) return null;

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col font-sans relative">
      <AnimatePresence>
        {showSplash && (
          <div className="fixed inset-0 z-[110] bg-[#070b14]/97 flex flex-col items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-center space-y-4"
            >
              <p className="text-xs font-black text-violet-400 uppercase tracking-[0.35em]">
                Глава {splashChapter}
              </p>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight px-6 max-w-4xl leading-tight">
                {splashTitle}
              </h1>
              <div className="h-1.5 w-24 bg-gradient-to-r from-violet-500 to-cyan-400 mx-auto rounded-full mt-6 shadow-[0_0_15px_rgba(139,92,246,0.5)] animate-pulse" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Header />

      <main role="main" className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 max-w-7xl w-full mx-auto relative z-10">
        
        {/* Left column: Curriculum & Lesson description */}
        <div className="flex flex-col gap-6">
          
          {/* Lessons navigation list */}
          <div className="rounded-[24px] border border-white/5 bg-surface p-5 flex flex-col gap-4" aria-label="Навигация по урокам" role="navigation">
            <h3 className="font-bold text-sm text-gray-400 flex items-center gap-2 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-violet-400" />
              Твоя программа обучения
            </h3>
            
            <div className="flex flex-col gap-2">
              {steps.map((step) => {
                const isActive = step.id === lessonId;
                const isCompleted = step.status === "completed";
                const isLocked = step.status === "locked" && !isActive && !isCompleted;
                
                return (
                  <Link
                    key={step.id}
                    href={isLocked ? "#" : `/lesson/${step.id}`}
                    onClick={(e) => isLocked && e.preventDefault()}
                    aria-label={`Урок ${step.id}: ${step.name}`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={isLocked}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? "bg-violet-500/10 border-violet-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        : isCompleted
                        ? "bg-cyan-500/5 border-cyan-500/15 text-cyan-300 hover:bg-cyan-500/10"
                        : "bg-white/[0.02] border-white/5 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs ${
                        isActive
                          ? "bg-violet-500 text-white"
                          : isCompleted
                          ? "bg-cyan-500 text-white"
                          : "bg-white/10 text-gray-500"
                      }`}>
                        {step.id}
                      </span>
                      <span className="text-xs font-semibold max-w-[200px] truncate">{step.name}</span>
                    </div>
                    {!isLocked && <ChevronRight className="w-4 h-4 text-gray-500" />}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Current Lesson details card */}
          <div className="rounded-[28px] border border-white/5 bg-surface p-6 shadow-xl flex flex-col gap-5">
            <div>
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest">
                Урок {lessonId} из 5
              </span>
              <h2 className="mt-3 text-2xl font-black text-white">{lessonData.title}</h2>
            </div>

            <div className="text-sm text-gray-300 leading-relaxed space-y-3">
              <p>
                {lessonId === 1 && "Наш космический питомец спит внутри яйца. Напиши промпт, чтобы разбудить его и задать характер!"}
                {lessonId === 2 && "Определи стиль речи питомца. Мы научимся управлять контекстом и системными ролями ИИ."}
                {lessonId === 3 && "Вирус атакует! Твоя задача — настроить ИИ-код на замену букв символом звездочки."}
                {lessonId === 4 && "Исправь зрение питомца, объяснив модели её ошибку. Мы учимся калибровать веса модели."}
                {lessonId === 5 && "Финальный босс! Напиши промпт с ветвлением логики, чтобы победить вредоносный код."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Цель задания:</span>
              <span className="text-xs text-gray-300 leading-relaxed font-semibold">
                {lessonId === 1 && "Отправь 3 прилагательных через запятую в поле ввода."}
                {lessonId === 2 && "Добавь в инструкцию слово 'рычать' или 'рычи'."}
                {lessonId === 3 && "Укажи символ '*' или слово 'шифр' в запросе."}
                {lessonId === 4 && "Введи 'ошибка' или 'исправь' и назови объект собакой."}
                {lessonId === 5 && "Напиши условие ЕСЛИ/ТОГДА (например: ЕСЛИ босс, ТОГДА урон)."}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Trophy className="w-4 h-4" />
                <span>+{lessonData.reward.xp} XP</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <span>💎</span>
                <span>+{lessonData.reward.crystals} кристаллов</span>
              </div>
            </div>

          </div>

          <GachaCalendar currentStreak={streak} lastActive={lastActive} />

        </div>

        {/* Right column: Monster visualizer, Chat console & input */}
        <div className="flex flex-col gap-6 min-w-0">
          
          {/* Active Monster glowing card */}
          <div className="rounded-[28px] border border-white/5 bg-surface/90 p-5 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <MonsterAvatar
                mood={
                  isModalOpen
                    ? "celebrating"
                    : latency === "Загрузка..."
                    ? "thinking"
                    : latency === "Ошибка"
                    ? "sad"
                    : "happy"
                }
                color={monsterColor}
                size={64}
              />
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Мой ИИ-напарник</p>
                <h4 className="font-extrabold text-lg text-white mt-0.5">{activeMonsterName}</h4>
              </div>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/60">
              Урок {lessonId}/5
            </div>
          </div>

          {/* Chat log & Console */}
          <div className="flex-grow flex flex-col gap-4 rounded-[28px] border border-white/5 bg-surface/60 p-6 shadow-xl relative overflow-hidden" aria-live="polite">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.03),transparent_40%)] pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Терминал настройки монстра
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Safe Proxy</span>
              </div>
            </div>

            <ChatWindow />
            
            <PromptInput />

          </div>

        </div>

      </main>

      {/* Reward modal popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="bg-[#111625] border border-white/10 rounded-[32px] p-8 max-w-sm w-full relative z-10 text-center shadow-2xl space-y-6">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-4xl mx-auto shadow-[0_0_40px_rgba(245,158,11,0.2)]"
            >
              {/* Static gem — the parent's spring entrance gives it life; an infinite y-bob under
                  a full-viewport backdrop forced a 45s GPU recomposite freeze on the iPad target. */}
              <span className="inline-block select-none">💎</span>
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Задание выполнено!</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {modalDesc}
              </p>
            </div>
            <button 
              onClick={() => {
                setIsModalOpen(false);
                // Redirect to next lesson if available, or dashboard
                if (lessonId < 5) {
                  router.push(`/lesson/${lessonId + 1}`);
                } else {
                  router.push("/dashboard");
                }
              }}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 hover:from-violet-600 hover:to-cyan-500 text-white font-extrabold py-3.5 px-6 rounded-full shadow-lg transition-all text-sm uppercase tracking-wider cursor-pointer"
            >
              {lessonId < 5 ? "Следующий урок" : "В личный кабинет"}
            </button>
          </div>
        </div>
      )}

      {/* The graduation payoff card. Renders only when generatedMonster is set (after "Оживить").
          Was defined but never mounted, so the reward never appeared. */}
      <MonsterCard />

    </div>
  );
}
