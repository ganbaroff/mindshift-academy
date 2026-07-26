"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameStore } from "@/stores/game";
import { Header } from "@/components/layout/Header";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PromptInput } from "@/components/chat/PromptInput";
import { MonsterCard } from "@/components/modals/MonsterCard";
import { GeneratingOverlay } from "@/components/modals/GeneratingOverlay";
import { GachaCalendar } from "@/components/gamification/GachaCalendar";
import { LESSON_PROMPTS } from "@/lib/curriculum";
import { BookOpen, Trophy, ShieldCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/sound-engine";
import { lessonStatus, completedLessonIdsFromUser } from "@/lib/progression";

// Lesson intro copy — a pure function of the step id (it does not use the monster name/skin).
// Kept at module scope so it isn't re-created per render and has no declaration-order coupling
// with the effects that read it (the earlier in-component decl tripped react-hooks rules).
function getIntroductionText(step: number): string {
  switch (step) {
    case 1:
      return `Привет! 🥚 Я нахожусь внутри этого цифрового яйца. Чтобы я пробудился и вылупился наружу, тебе нужно прописать в промпте снизу 3 моих главных качества (например: "храбрый, быстрый, весёлый")!`;
    case 2:
      return `Ура! Я ожил! 🐲 Теперь давай настроим мой стиль речи. Напиши мне промпт-инструкцию, как весело мне говорить. Добавь команду "пой" или "добавляй огонёк 🔥 к каждому слову", и я радостно перейду на этот стиль!`;
    case 3:
      return `Давай придумаем наш секретный код для переписки с друзьями! 🔐 Напиши промпт-инструкцию, чтобы я заменял все гласные буквы символом "*", — и никто, кроме нас, не прочитает сообщения.`;
    case 4:
      return `Ой... Кажется, мои сенсоры машинного зрения сбились. 🐱 На картинке перед мной собака, но я думаю, что это кошка! Исправь мою ошибку через промпт-тюнинг!`;
    case 5:
      return `Финальный квест! 🧩 Я, дракончик, застрял в лабиринте-головоломке. Помоги мне пройти путь, написав правило с условием ЕСЛИ/ТО (например: "ЕСЛИ впереди стена, ТО поверни налево, иначе иди вперёд"). Напиши код!`;
    default:
      return `Привет! Я твой ИИ-напарник. Напиши мне промпт, чтобы начать урок!`;
  }
}

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

  // Track persist rehydration so the jump-ahead guard below doesn't bounce a
  // legitimately-unlocked deep lesson on refresh before completedLessons loads.
  // Start false (persist API isn't attached during SSR); the effect below flips
  // it once hydration has finished on the client.
  const [hydrated, setHydrated] = useState(false);

  const {
    setActiveStepId,
    activeSkin,
    activeMonsterName,
    monsterColor,
    steps,
    setSteps,
    completedLessons,
    setCompletedLessons,
    setActiveSkin,
    isModalOpen,
    setIsModalOpen,
    modalDesc,
    latency,
    setMessages,
    setCrystals,
    setTotalXp,
    setInputLocked
  } = useGameStore();

  // Kick off the per-lesson intro splash when the lesson changes. These synchronous sets
  // start a transient cutscene (cleared by the timer below), an intentional UI-init pattern —
  // suppress the new set-state-in-effect rule for this effect only.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (lessonData) {
      setSplashChapter(lessonId);
      setSplashTitle(lessonData.title);
      setShowSplash(true);
      const timer = setTimeout(() => setShowSplash(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [lessonId, lessonData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Lock the chat input while the intro splash is on screen so a fast child's
  // first message isn't fired into a chat the mount effect is about to reset to
  // the intro (which silently dropped it). Driven directly off showSplash — a
  // single source of truth — so StrictMode's setup→cleanup→setup double-invoke
  // and the splash timer can't leave the flag stuck in the wrong state.
  useEffect(() => {
    setInputLocked(showSplash);
    return () => setInputLocked(false);
  }, [showSplash, setInputLocked]);

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
          // SERVER-AUTHORITATIVE RECONCILE: rebuild the completed-lesson unlock set from
          // server truth, overwriting the optimistic localStorage cache. The store now
          // caches server progress rather than owning an independent ledger — so a fresh
          // device / re-login shows real progress instead of an empty (relocked) list.
          setCompletedLessons(completedLessonIdsFromUser(data));
          // Hydrate the monster (skin/name/color) from the server if one already exists.
          if (data.monster) {
            setActiveSkin(data.monster.emoji, data.monster.name, data.monster.color);
          }
        }
      })
      .catch((err) => console.error("Error loading user profile:", err));
  }, [setActiveSkin, setCompletedLessons, setCrystals, setTotalXp]);

  const rewardButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isModalOpen) {
      soundEngine.play("crystal");
      // Move focus into the dialog so keyboard/screen-reader users land on the
      // primary action, and let Escape dismiss it (backdrop click alone is not
      // keyboard-reachable).
      rewardButtonRef.current?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsModalOpen(false);
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [isModalOpen, setIsModalOpen]);

  // Mark hydration complete once the persisted store finishes rehydrating.
  // Client-only: the persist API is not present on the SSR pass.
  // Mark hydration complete once the persisted store finishes rehydrating. This syncs the
  // store's (external) hydration status into React state — the documented exception to the
  // rule; suppress it for this effect only.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const persist = useGameStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    if (persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Jump-ahead guard: block direct-URL access to a still-locked lesson (the nav
  // links already block clicks, but a typed/bookmarked URL bypassed them). The
  // furthest reachable lesson is highestCompleted+1 (lesson 1 always open). Only
  // enforce after hydration so a refresh on a genuinely-unlocked lesson isn't
  // bounced before completedLessons has loaded.
  useEffect(() => {
    if (!hydrated || !lessonData) return;
    const highestCompleted = completedLessons.length ? Math.max(...completedLessons) : 0;
    const maxUnlocked = Math.max(1, highestCompleted + 1);
    if (lessonId > maxUnlocked) {
      router.replace(`/lesson/${maxUnlocked}`);
    }
  }, [hydrated, lessonId, completedLessons, lessonData, router]);

  // Navigation effect: fires only on a real lesson change. Sets the active step
  // and resets the chat to the lesson intro. Intentionally does NOT depend on
  // completedLessons — otherwise finishing a lesson (which marks it completed)
  // would instantly wipe the reward conversation back to the intro.
  useEffect(() => {
    if (!lessonData) {
      router.replace("/lesson/1");
      return;
    }

    setActiveStepId(lessonId);

    const introductionText = getIntroductionText(lessonId);
    setMessages([
      {
        id: "init",
        sender: "monster",
        avatar: activeSkin,
        text: introductionText,
      },
    ]);
  }, [lessonId, lessonData, router, activeMonsterName, activeSkin, setActiveStepId, setMessages]);

  // Lock/complete derivation: depends on REAL per-lesson completion
  // (completedLessons), NOT on the current position. The furthest lesson the
  // child may reach is the one right after their highest completed lesson
  // (lesson 1 is always open). Navigating backward therefore never relocks
  // later lessons. Runs on its own so marking a lesson done updates the nav
  // list WITHOUT resetting the chat.
  useEffect(() => {
    if (!lessonData) return;
    setSteps((prev) => {
      // Lock/complete derivation extracted to the pure `lessonStatus` seam (progression.ts)
      // so it can be asserted offline. Behavior is byte-identical to the former inline map.
      return prev.map((step) => ({
        ...step,
        status: lessonStatus(step.id, completedLessons, lessonId),
      }));
    });
  }, [lessonId, completedLessons, lessonData, setSteps]);

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
              <div className="h-1.5 w-24 bg-gradient-to-r from-violet-500 to-cyan-400 mx-auto rounded-full mt-6 shadow-[0_0_15px_rgba(139,92,246,0.5)] animate-pulse motion-reduce:animate-none" />
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
              <BookOpen aria-hidden="true" className="w-4 h-4 text-violet-400" />
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
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-[transform,opacity] ${
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
                    {!isLocked && <ChevronRight aria-hidden="true" className="w-4 h-4 text-gray-500" />}
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
                {lessonId === 3 && "Придумай секретный код для друзей! Твоя задача — настроить ИИ-код на замену букв символом звездочки."}
                {lessonId === 4 && "Исправь зрение питомца, объяснив модели её ошибку. Мы учимся давать понятные уточнения."}
                {lessonId === 5 && "Финальный квест! Напиши промпт с ветвлением логики, чтобы помочь дракончику пройти лабиринт."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Цель задания:</span>
              <span className="text-xs text-gray-300 leading-relaxed font-semibold">
                {lessonId === 1 && "Отправь 3 прилагательных через запятую в поле ввода."}
                {lessonId === 2 && "Добавь в инструкцию команду о стиле: 'пой' или 'добавляй огонёк 🔥'."}
                {lessonId === 3 && "Укажи символ '*' или слово 'код' в запросе."}
                {lessonId === 4 && "Введи 'ошибка' или 'исправь' и назови объект собакой."}
                {lessonId === 5 && "Напиши условие ЕСЛИ/ТОГДА (например: ЕСЛИ впереди стена, ТО поверни налево)."}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Trophy aria-hidden="true" className="w-4 h-4" />
                <span>+{lessonData.reward.xp} XP</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <span aria-hidden="true">💎</span>
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
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse motion-reduce:animate-none" />
                Терминал настройки монстра
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-cyan-400" />
                <span>Защита включена</span>
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
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-modal-title"
            className="bg-[#111625] border border-white/10 rounded-[32px] p-8 max-w-sm w-full relative z-10 text-center shadow-2xl space-y-6"
          >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-4xl mx-auto shadow-[0_0_40px_rgba(245,158,11,0.2)]"
            >
              {/* Static gem — the parent's spring entrance gives it life; an infinite y-bob under
                  a full-viewport backdrop forced a 45s GPU recomposite freeze on the iPad target. */}
              <span aria-hidden="true" className="inline-block select-none">💎</span>
            </motion.div>
            <div className="space-y-2">
              <h3 id="reward-modal-title" className="text-2xl font-black text-white">Задание выполнено!</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                {modalDesc}
              </p>
            </div>
            <button
              ref={rewardButtonRef}
              onClick={() => {
                setIsModalOpen(false);
                // Redirect to next lesson if available, or dashboard
                if (lessonId < 5) {
                  router.push(`/lesson/${lessonId + 1}`);
                } else {
                  router.push("/dashboard");
                }
              }}
              className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 hover:from-violet-600 hover:to-cyan-500 text-white font-extrabold py-3.5 px-6 rounded-full shadow-lg transition-[transform,opacity] text-sm uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111625]"
            >
              {lessonId < 5 ? "Следующий урок" : "В личный кабинет"}
            </button>
          </div>
        </div>
      )}

      {/* The graduation payoff card. Renders only when generatedMonster is set (after "Оживить").
          Was defined but never mounted, so the reward never appeared. */}
      <MonsterCard />

      {/* Loading feedback during the ~10-30s DALL-E graduation-card generation.
          Self-gates on isGeneratingMonster; without it the "Оживить" button froze silently. */}
      <GeneratingOverlay />

    </div>
  );
}
