"use client";

import { useRef, useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2, RotateCcw, Sparkles, WandSparkles } from "lucide-react";

function splitWords(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function hashWords(words: string[]) {
  let hash = 0;

  for (const word of words) {
    for (let index = 0; index < word.length; index += 1) {
      hash = (hash * 31 + word.charCodeAt(index)) % 1000;
    }
  }

  return hash;
}

export function InteractiveShowcase() {
  const prefersReducedMotion = useReducedMotion();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"draft" | "locked">("draft");
  const [status, setStatus] = useState("Введите ровно 3 слова, чтобы запустить силуэт.");
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [monsterData, setMonsterData] = useState<{
    name: string;
    emoji: string;
    color: string;
    description: string;
  } | null>(null);

  const words = splitWords(input);
  const wordCount = words.length;
  const isReady = wordCount === 3;
  const seed = hashWords(words);
  const hue = 255 + (seed % 36);
  const accent = monsterData?.color || `hsl(${hue} 92% 68%)`;
  const silhouetteScale = phase === "locked" ? 1 : 0.92;
  const title = phase === "locked" ? "Силуэт готов. Дальше — код" : "Силуэт появляется первым";
  const ctaLabel =
    phase === "draft"
      ? isSubmitting
        ? "Генерируем силуэт…"
        : "Создать силуэт"
      : isSubmitting
        ? "Переходим к коду…"
        : "У меня есть код";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (phase === "draft") {
      if (!isReady) {
        const message = "Нужно ввести ровно 3 слова.";
        setStatus(message);
        // Surface the validation inline next to the field and move focus there so
        // keyboard/screen-reader users land on the problem instead of hunting for it.
        setInputError(message);
        inputRef.current?.focus();
        return;
      }

      setInputError(null);
      setIsSubmitting(true);
      setStatus("Пробуждаем силуэт монстра…");

      try {
        const response = await fetch("/api/generate-silhouette", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words }),
        });

        if (!response.ok) {
          throw new Error("Не удалось получить силуэт монстра.");
        }

        const data = await response.json();
        setMonsterData(data);
        setPhase("locked");
        setStatus("Силуэт готов. Для курса понадобится код от родителя.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка генерации силуэта.");
        // Local fallback so user experience isn't fully broken if API fails
        setPhase("locked");
        setStatus("Силуэт запущен в ознакомительном режиме.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    setStatus("Переходим к вводу кода…");
    window.location.assign("/enter-code");
  };

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-surface/90 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,0.16),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.12),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%)]" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-warning" />
            Инкубатор питомцев
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-right text-xs text-white/60">
          <p>Интерактивная проба</p>
          <p className="mt-1 text-white/80">Без стресса и оценок</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white/70">Введите 3 слова-описания монстра</span>
          <input
            ref={inputRef}
            name="monster-words"
            value={input}
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? "monster-words-error" : undefined}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
              setInputError(null);
              if (phase === "locked") {
                setPhase("draft");
                setMonsterData(null);
                setStatus("Вернитесь к словам, если хотите поменять силуэт.");
              } else {
                setStatus("Введите ровно 3 слова, чтобы запустить силуэт.");
              }
            }}
            placeholder="храбрый быстрый весёлый"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full rounded-2xl border border-white/10 bg-surface-strong/90 px-4 text-base text-white outline-none transition-[border-color,box-shadow] focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          {inputError ? (
            <span id="monster-words-error" role="alert" className="block text-sm font-medium text-warning">
              {inputError}
            </span>
          ) : null}
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white/58">
            <span className={isReady ? "text-warning" : "text-white/45"}>{wordCount}/3 слов</span>
            <span className="mx-2 text-white/25">•</span>
            <span>{phase === "draft" ? "Сначала силуэт" : "Теперь нужен код"}</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : phase === "draft" ? (
              <WandSparkles className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {ctaLabel}
          </button>
        </div>
      </form>

      <div className="relative z-10 mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-surface-strong/85 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">Предпросмотр</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {phase === "draft" ? "Магия начинается здесь" : "Твой питомец готов"}
            </p>
          </div>

          <div
            className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/70"
            style={{ color: accent }}
          >
            {phase === "draft" ? "Превью" : "Готово"}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <motion.div
            key={`${phase}-${seed}`}
            animate={{
              scale: silhouetteScale,
              opacity: 1,
              rotate: phase === "locked" ? 0 : -1,
            }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.55,
              ease: "easeOut",
            }}
            className="relative h-60 w-60"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0 rounded-[48%_52%_45%_55%/55%_45%_55%_45%] blur-2xl"
              style={{
                background: `radial-gradient(circle at 50% 25%, rgba(255,255,255,0.18), transparent 30%), radial-gradient(circle at 50% 55%, ${accent}88, rgba(12,16,32,0.95) 70%)`,
              }}
            />
            <div
              className="absolute inset-6 rounded-[46%_54%_44%_56%/56%_44%_56%_44%] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))] shadow-[inset_0_0_40px_rgba(255,255,255,0.08)]"
              style={{
                transform: `translateY(${phase === "locked" ? 0 : 4}px)`,
              }}
            />
            <div
              className="absolute inset-[32px] rounded-[44%_56%_42%_58%/57%_43%_57%_43%] shadow-[0_0_70px_rgba(139,92,246,0.28)]"
              style={{
                filter: phase === "locked" ? "blur(3px)" : "blur(5px)",
                background: `radial-gradient(circle at 35% 30%,rgba(255,255,255,0.14),transparent_24%),linear-gradient(180deg, ${accent}cc, rgba(17,24,39,0.95))`,
                boxShadow: `0 0 70px ${accent}44`,
              }}
            />
            {/* Blurred silhouette — a hint of a creature lives in the egg even before input */}
            <div
              className="absolute inset-0 flex select-none items-center justify-center text-7xl transition-[filter] duration-500"
              style={{
                filter: phase === "locked"
                  ? "brightness(0) contrast(100%) blur(4px) opacity(0.85)"
                  : "brightness(0) contrast(100%) blur(10px) opacity(0.38)",
              }}
              aria-hidden="true"
            >
              {monsterData?.emoji ?? "🥚"}
            </div>
            <div className="absolute left-1/2 top-10 h-12 w-24 -translate-x-1/2 rounded-full bg-white/10 blur-2xl" />
          </motion.div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {words.length > 0 ? (
            words.map((word, index) => (
              <span
                key={`${word}-${index}`}
                className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white/82"
              >
                {word}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-dashed border-white/10 px-3 py-1.5 text-sm text-white/38">
              Слова появятся здесь
            </span>
          )}
        </div>

        <div className="mt-6 flex items-start justify-between gap-4 border-t border-white/8 pt-4">
          <div className="space-y-1" role="status" aria-live="polite">
            {monsterData?.description && phase === "locked" ? (
              <p className="text-sm font-medium text-white/90">{monsterData.description}</p>
            ) : null}
            <p className="text-sm text-white/62">{status}</p>
            {error ? <p className="text-sm text-error">{error}</p> : null}
          </div>

          {phase === "locked" ? (
            <button
              type="button"
              onClick={() => {
                setPhase("draft");
                setMonsterData(null);
                setStatus("Вернулись к словам. Можно уточнить силуэт.");
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/72 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <RotateCcw className="h-4 w-4" />
              Изменить слова
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
