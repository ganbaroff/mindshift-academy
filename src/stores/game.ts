import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message, Step, Achievement, Skin, Monster } from '@/types';

interface GameState {
  // Monster settings
  activeSkin: string;
  activeMonsterName: string;
  monsterColor: string;
  
  // Player stats
  totalXp: number;
  crystals: number;
  
  // Game progression
  isVoiceActive: boolean;
  activeStepId: number;
  // Real per-lesson completion, persisted. This is the source of truth for
  // lock/unlock — NOT the current lessonId position. Navigating backward to an
  // earlier lesson must never relock later lessons, so lock state is derived
  // from this set (see lesson page), never recomputed from position.
  completedLessons: number[];
  
  // UI states
  promptInput: string;
  // True while the lesson intro splash is animating. The chat input is disabled
  // during this window so a fast child's first message isn't sent into a chat
  // that the mount/navigation effect is about to reset to the intro (which
  // silently dropped the message). Transient — never persisted.
  inputLocked: boolean;
  isProxyView: boolean;
  promptCount: number;
  currentCost: number;
  latency: string;
  isGeneratingMonster: boolean;
  generatedMonster: Monster | null;
  
  // Data arrays
  messages: Message[];
  steps: Step[];
  achievements: Achievement[];
  
  // Modals
  isModalOpen: boolean;
  modalDesc: string;

  // Video
  isPlaying: boolean;
  
  // Actions
  setTotalXp: (val: number | ((prev: number) => number)) => void;
  setCrystals: (val: number | ((prev: number) => number)) => void;
  setActiveStepId: (id: number) => void;
  setPromptInput: (val: string) => void;
  setInputLocked: (val: boolean) => void;
  setMessages: (val: Message[] | ((prev: Message[]) => Message[])) => void;
  setPromptCount: (val: number | ((prev: number) => number)) => void;
  setLatency: (val: string) => void;
  setCurrentCost: (val: number) => void;
  setSteps: (val: Step[] | ((prev: Step[]) => Step[])) => void;
  setAchievements: (val: Achievement[] | ((prev: Achievement[]) => Achievement[])) => void;
  setIsModalOpen: (val: boolean) => void;
  setModalDesc: (val: string) => void;
  setActiveSkin: (emoji: string, name: string, color: string) => void;
  setIsVoiceActive: (val: boolean) => void;
  setIsProxyView: (val: boolean) => void;
  setIsPlaying: (val: boolean) => void;
  setIsGeneratingMonster: (val: boolean) => void;
  setGeneratedMonster: (val: Monster | null) => void;
  updateXP: (amount: number) => void;
  // Idempotently record a lesson as completed. Additive only — never removes,
  // so backward navigation can't regress progress.
  markLessonCompleted: (lessonId: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  activeSkin: "🐲",
  activeMonsterName: "Огненный Дракончик",
  monsterColor: "#8b5cf6",
  totalXp: 0,
  crystals: 0,
  isVoiceActive: false,
  activeStepId: 1,
  completedLessons: [],
  promptInput: "",
  inputLocked: false,
  isProxyView: false,
  promptCount: 0,
  currentCost: 0.00018,
  latency: "0.82 сек",
  isGeneratingMonster: false,
  generatedMonster: null,
  
  messages: [
    {
      id: "init",
      sender: "monster",
      avatar: "🐲",
      text: `Привет, будущий повелитель драконов! 🐲 Я твой новый огненный помощник. Пока что я говорю обычным голосом. Измени мой характер в поле ввода снизу! Например, напиши: "Говори как грозный, но добрый дракон, рычи перед каждым предложением!"`,
    }
  ],
  
  steps: [
    { id: 1, name: "Пробуждение яйца: вылупи питомца", xp: "+100 XP • Награда: Питомец 🥚", status: "active", hint: "3 качества" },
    { id: 2, name: "Настройка характера: научи монстра говорить", xp: "+150 XP • Награда: Ачивка 👾", status: "locked", hint: "рычи" },
    { id: 3, name: "Секретный язык: сделай шифр для общения", xp: "+200 XP • Награда: Ачивка 🗣️", status: "locked", hint: "звезд" },
    { id: 4, name: "Машинное зрение: исправь ошибку ИИ", xp: "+250 XP • Награда: Карта 🗺️", status: "locked", hint: "не кошка" },
    { id: 5, name: "Битва промптов: одолей Bugzilla", xp: "+500 XP • Награда: Корона 👑", status: "locked", hint: "сложные условия" }
  ],
  
  achievements: [
    { id: 1, emoji: "🎯", title: "Повелитель промптов", desc: "Написал первый запрос", unlocked: true },
    { id: 2, emoji: "👾", title: "Создатель монстра", desc: "Оживил напарника промптом", unlocked: false },
    { id: 3, emoji: "🗣️", title: "Спикер", desc: "Включил голосовую озвучку ответов", unlocked: false }
  ],
  
  isModalOpen: false,
  modalDesc: "",
  isPlaying: false,

  setTotalXp: (val) => set((state) => ({ totalXp: typeof val === 'function' ? val(state.totalXp) : val })),
  setCrystals: (val) => set((state) => ({ crystals: typeof val === 'function' ? val(state.crystals) : val })),
  setActiveStepId: (id) => set({ activeStepId: id }),
  setPromptInput: (val) => set({ promptInput: val }),
  setInputLocked: (val) => set({ inputLocked: val }),
  setMessages: (val) => set((state) => ({ messages: typeof val === 'function' ? val(state.messages) : val })),
  setPromptCount: (val) => set((state) => ({ promptCount: typeof val === 'function' ? val(state.promptCount) : val })),
  setLatency: (val) => set({ latency: val }),
  setCurrentCost: (val) => set({ currentCost: val }),
  setSteps: (val) => set((state) => ({ steps: typeof val === 'function' ? val(state.steps) : val })),
  setAchievements: (val) => set((state) => ({ achievements: typeof val === 'function' ? val(state.achievements) : val })),
  setIsModalOpen: (val) => set({ isModalOpen: val }),
  setModalDesc: (val) => set({ modalDesc: val }),
  
  setActiveSkin: (emoji, name, color) => set({
    activeSkin: emoji,
    activeMonsterName: name,
    monsterColor: color,
  }),
  
  setIsVoiceActive: (val) => set({ isVoiceActive: val }),
  setIsProxyView: (val) => set({ isProxyView: val }),
  setIsPlaying: (val) => set({ isPlaying: val }),
  setIsGeneratingMonster: (val) => set({ isGeneratingMonster: val }),
  setGeneratedMonster: (val) => set({ generatedMonster: val }),

  markLessonCompleted: (lessonId) => set((state) =>
    state.completedLessons.includes(lessonId)
      ? state
      : { completedLessons: [...state.completedLessons, lessonId] }
  ),
  
  updateXP: (amount: number) => {
    set((state) => {
      let next = state.totalXp + amount;
      if (next >= 1000) {
        next = next - 1000;
        // Route the level-up milestone through the branded in-app reward modal
        // (confetti/gem UI) instead of a blocking native alert().
        return {
          totalXp: next,
          modalDesc: "Новый уровень! Ты достиг Уровня 3 — твой ИИ-питомец стал сильнее!",
          isModalOpen: true,
        };
      }
      return { totalXp: next };
    });
  }
    }),
    {
      name: "mindshift-game-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist ONLY client-side UI state that is safe to restore after F5.
      // Deliberately EXCLUDES server-authoritative progress (totalXp, crystals,
      // activeStepId) and transient/render-only fields — the server is the source
      // of truth for progress, re-fetched on load (see lesson page /api/user).
      // Also excludes latency/currentCost/promptCount/generatedMonster and modal
      // flags so a reload never resurrects a stale modal or a mid-flight cost.
      partialize: (state) => ({
        messages: state.messages,
        steps: state.steps,
        achievements: state.achievements,
        activeSkin: state.activeSkin,
        activeMonsterName: state.activeMonsterName,
        monsterColor: state.monsterColor,
        isVoiceActive: state.isVoiceActive,
        // Which lessons the child has actually completed — the unlock source of
        // truth. Additive-only + used only to UNLOCK (never to lower XP/crystals),
        // so persisting it can't regress server-authoritative progress.
        completedLessons: state.completedLessons,
      }),
      // Server-authoritative merge: start from the current (fresh) state, layer the
      // cached UI state on top, but NEVER let cached progress win — totalXp/crystals/
      // activeStepId are intentionally not in the persisted slice, and we hard-guard
      // here so a future partialize change can't silently regress progress. The lesson
      // page's /api/user fetch then sets the true server values after rehydration.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>;
        return {
          ...current,
          ...p,
          // Progress fields are always taken from the freshly-created store defaults
          // (which the server load then overwrites) — cached values must not lower them.
          totalXp: current.totalXp,
          crystals: current.crystals,
          activeStepId: current.activeStepId,
        };
      },
    }
  )
);
