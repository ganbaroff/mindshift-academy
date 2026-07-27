"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";

type Phase = "hatching" | "naming" | "ready";

const HATCH_MESSAGES = [
  "Яйцо трескается…",
  "Что-то шевелится внутри…",
  "Свет пробивается сквозь скорлупу…",
  "Твой питомец просыпается!",
];

const PET_NAME_MAX = 24;

// P1-H (defense-in-depth at entry): the pet-name is free child text that later gets
// spliced into the tutor system prompt (server-side sanitizeForPrompt() is the hard
// gate). Bound it here too so obviously-injectiony/PII-ish input never even reaches
// state: drop control chars, prompt-structure chars (quotes/backticks/braces/angle-
// brackets), and email/phone/long-digit runs; cap length. Empty result is allowed —
// the confirm button already disables on an empty trimmed name.
function sanitizePetName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "") // control chars
    .replace(/[<>{}"'`\\]/g, "") // prompt-structure / injection chars
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, "") // emails
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "") // phone-like sequences
    .replace(/\d{5,}/g, "") // long digit runs
    .slice(0, PET_NAME_MAX);
}

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const prefersReducedMotion = useReducedMotion();

  const monsterEmoji = params.get("emoji") || "🐉";
  const monsterColor = params.get("color") || "#a78bfa";
  // Sanitize the seed name too — it arrives via URL query (attacker-controllable).
  const defaultName = sanitizePetName(params.get("name") || "") || "Огняш";

  const [phase, setPhase] = useState<Phase>("hatching");
  const [hatchStep, setHatchStep] = useState(0);
  const [petName, setPetName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const lastHatchStep = HATCH_MESSAGES.length - 1;
  const isHatched = hatchStep >= lastHatchStep;

  // The hatch plays itself like a short cutscene — messages auto-advance so the
  // child just watches. A tap anywhere skips straight to the reveal.
  useEffect(() => {
    if (phase !== "hatching") return;
    if (prefersReducedMotion) {
      // Reduced-motion users skip the cutscene straight to the reveal — syncing to the OS
      // motion preference (an external system), the documented exception to this rule.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHatchStep(lastHatchStep);
      return;
    }
    if (hatchStep >= lastHatchStep) return;
    const timer = setTimeout(() => {
      setHatchStep((s) => Math.min(s + 1, lastHatchStep));
    }, 1300);
    return () => clearTimeout(timer);
  }, [phase, hatchStep, prefersReducedMotion, lastHatchStep]);

  const skipHatch = () => setHatchStep(lastHatchStep);

  const confirmName = async () => {
    if (petName.trim().length === 0 || saving) return;
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/monster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: petName,
          emoji: monsterEmoji,
          color: monsterColor,
          promptUsed: "Выбран при онбординге",
          skipImage: true
        })
      });
      // COPPA gate: /api/monster returns 403 when parental consent isn't valid. Send the
      // parent to the consent screen instead of silently advancing into a lesson whose
      // chat would then 403. (The onboarding layout already gates this — belt and braces.)
      if (res.status === 403) {
        router.push("/consent");
        return;
      }
      // A real failure must NOT advance to "ready" with an unsaved monster — surface a
      // soft, retryable error and stay on the naming step (fixes the prior silent-advance).
      if (!res.ok) {
        console.error("Failed to save monster on onboarding:", res.status);
        setSaveError("Не удалось сохранить питомца. Попробуй ещё раз.");
        return;
      }
    } catch (err) {
      console.error("Failed to save monster name on onboarding:", err);
      setSaveError("Сеть недоступна. Попробуй ещё раз.");
      return;
    } finally {
      setSaving(false);
    }
    setPhase("ready");
  };

  const goToFirstLesson = () => {
    // Thinking curriculum entry — Module 1 /lesson/1 is legacy archive.
    router.push("/session/w1-s1");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        {phase === "hatching" && (
          <motion.div
            key="hatching"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
            className="space-y-8"
          >
            <motion.div
              animate={{
                scale: [1, 1.06, 1],
                rotate: [0, hatchStep * 3, 0],
              }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.6,
                ease: "easeInOut",
              }}
              className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-surface-strong/80 text-7xl shadow-[0_0_80px_rgba(139,92,246,0.3)]"
              style={{
                boxShadow: `0 0 ${40 + hatchStep * 20}px ${monsterColor}44`,
              }}
            >
              {!isHatched ? (
                "🥚"
              ) : (
                <MonsterAvatar mood="happy" color={monsterColor} size={144} />
              )}
            </motion.div>

            <p className="text-lg font-medium text-white/90">
              {HATCH_MESSAGES[hatchStep]}
            </p>

            {/* Progress dots so the child senses the cutscene moving on its own */}
            <div className="flex items-center justify-center gap-2" aria-hidden>
              {HATCH_MESSAGES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none ${
                    i <= hatchStep ? "w-5 bg-primary" : "w-1.5 bg-white/15"
                  }`}
                />
              ))}
            </div>

            {isHatched ? (
              <button
                onClick={() => setPhase("naming")}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                Познакомиться!
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  skipHatch();
                }}
                className="text-sm font-medium text-white/45 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
              >
                Нажми, чтобы пропустить
              </button>
            )}
          </motion.div>
        )}

        {phase === "naming" && (
          <motion.div
            key="naming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
            className="space-y-6"
          >
            <div
              className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-surface-strong/80 text-6xl"
              style={{ boxShadow: `0 0 60px ${monsterColor}44` }}
            >
              <MonsterAvatar mood="thinking" color={monsterColor} size={112} />
            </div>

            <div className="space-y-2">
              <label htmlFor="pet-name" className="block text-xl font-semibold text-white">
                Как зовут твоего питомца?
              </label>
              <p id="pet-name-hint" className="text-sm text-white/60">
                Можешь оставить имя или придумать своё
              </p>
            </div>

            <input
              id="pet-name"
              name="petName"
              value={petName}
              onChange={(e) => setPetName(sanitizePetName(e.target.value))}
              maxLength={PET_NAME_MAX}
              autoComplete="off"
              aria-describedby="pet-name-hint"
              className="mx-auto h-14 w-full max-w-xs rounded-2xl border border-white/10 bg-surface-strong/90 px-4 text-center text-lg font-medium text-white outline-none transition-[border-color,box-shadow] focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
            />

            <button
              onClick={confirmName}
              disabled={saving || petName.trim().length === 0}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Сохраняем…" : `Это ${petName}!`}
              <ArrowRight className="h-4 w-4" />
            </button>

            {saveError && (
              <p role="alert" className="text-sm font-medium text-error">
                {saveError}
              </p>
            )}
          </motion.div>
        )}

        {phase === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
            className="space-y-6"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.8,
                ease: "easeOut",
              }}
              className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-surface-strong/80 text-7xl"
              style={{ boxShadow: `0 0 80px ${monsterColor}55` }}
            >
              <MonsterAvatar mood="celebrating" color={monsterColor} size={128} />
            </motion.div>

            <div className="space-y-2">
              <p className="text-2xl font-semibold text-white">
                {petName} готов учиться!
              </p>
              <p className="text-sm text-white/60">
                Первый урок: научи {petName} говорить. Напиши ему 3 слова, и он
                ответит.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface/80 p-4 text-left">
              <p className="text-xs font-medium uppercase tracking-widest text-white/40">
                Урок 1 из 5
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Пробуждение
              </p>
              <p className="mt-1 text-sm text-white/60">
                Дай питомцу 3 характеристики, чтобы он ожил
              </p>
            </div>

            <button
              onClick={goToFirstLesson}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Начать урок
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin motion-reduce:animate-none" />
        <p className="mt-4 text-sm font-semibold text-gray-400">Загрузка инкубатора…</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
