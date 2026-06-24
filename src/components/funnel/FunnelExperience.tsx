"use client";

import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2, RotateCcw, Sparkles, WandSparkles } from "lucide-react";

type CheckoutMode = "live" | "demo";

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

async function createCheckout(words: string[], monster?: { name: string; emoji: string; color: string } | null) {
  const response = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      monsterWords: words,
      name: monster?.name,
      emoji: monster?.emoji,
      color: monster?.color
    }),
  });

  const data: { checkoutUrl?: string; mode?: CheckoutMode; message?: string } =
    await response.json();

  if (!response.ok || !data.checkoutUrl) {
    throw new Error(data.message || "Checkout unavailable");
  }

  return data;
}

export function FunnelExperience() {
  const prefersReducedMotion = useReducedMotion();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"draft" | "paywall">("draft");
  const [status, setStatus] = useState("Введите ровно 3 слова, чтобы запустить силуэт.");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const silhouetteScale = phase === "paywall" ? 1 : 0.92;
  const title = phase === "paywall" ? "Силуэт заблокирован до оплаты" : "Силуэт появляется первым";
  const ctaLabel =
    phase === "draft"
      ? isSubmitting
        ? "Генерируем силуэт..."
        : "Создать силуэт"
      : isSubmitting
        ? "Открываем checkout..."
        : "Активировать за 29 AZN";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (phase === "draft") {
      if (!isReady) {
        setStatus("Нужно ровно 3 слова. Это и есть точка входа.");
        return;
      }

      setIsSubmitting(true);
      setStatus("Пробуждаем силуэт монстра...");

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
        setPhase("paywall");
        setStatus(`Силуэт монстра "${data.name}" успешно запущен!`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка генерации силуэта.");
        // Local fallback so user experience isn't fully broken if API fails
        setPhase("paywall");
        setStatus("Силуэт запущен (демо-режим).");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    setStatus("Подключаем Lemon Squeezy checkout...");

    try {
      const result = await createCheckout(words, monsterData);
      const checkoutUrl = result.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error("Не удалось открыть checkout.");
      }
      setStatus(result.mode === "demo" ? "Локальный demo-режим открыт." : "Checkout готов.");
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error ? checkoutError.message : "Не удалось открыть checkout."
      );
      setStatus("Попробуйте ещё раз или вернитесь к словам.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-surface/90 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,0.16),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.12),transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_40%)]" />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-warning" />
            Monster incubator
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-right text-xs text-white/60">
          <p>1 primary action</p>
          <p className="mt-1 text-white/80">No red, no shame</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-white/70">3-word monster seed</span>
          <input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError(null);
              if (phase === "paywall") {
                setPhase("draft");
                setMonsterData(null);
                setStatus("Вернитесь к словам, если хотите поменять силуэт.");
              } else {
                setStatus("Введите ровно 3 слова, чтобы запустить силуэт.");
              }
            }}
            placeholder="добрый огненный дракон"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full rounded-2xl border border-white/10 bg-surface-strong/90 px-4 text-base text-white outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-white/58">
            <span className={isReady ? "text-warning" : "text-white/45"}>{wordCount}/3 words</span>
            <span className="mx-2 text-white/25">•</span>
            <span>{phase === "draft" ? "Silhouette first" : "Paywall armed"}</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
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
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">Preview</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {phase === "draft" ? "Aha-момент ещё впереди" : "Силуэт скрыт за paywall"}
            </p>
          </div>

          <div
            className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/70"
            style={{ color: accent }}
          >
            {phase === "draft" ? "Energy safe" : "Activation gate"}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <motion.div
            key={`${phase}-${seed}`}
            animate={{
              scale: silhouetteScale,
              opacity: 1,
              rotate: phase === "paywall" ? 0 : -1,
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
                transform: `translateY(${phase === "paywall" ? 0 : 4}px)`,
              }}
            />
            <div
              className="absolute inset-[32px] rounded-[44%_56%_42%_58%/57%_43%_57%_43%] shadow-[0_0_70px_rgba(139,92,246,0.28)]"
              style={{
                filter: phase === "paywall" ? "blur(3px)" : "blur(5px)",
                background: `radial-gradient(circle at 35% 30%,rgba(255,255,255,0.14),transparent_24%),linear-gradient(180deg, ${accent}cc, rgba(17,24,39,0.95))`,
                boxShadow: `0 0 70px ${accent}44`,
              }}
            />
            {/* The Blurred Monster Emoji Silhouette */}
            {monsterData?.emoji ? (
              <div
                className="absolute inset-0 flex items-center justify-center text-7xl select-none transition-all duration-500"
                style={{
                  filter: phase === "paywall"
                    ? "brightness(0) contrast(100%) blur(4px) opacity(0.85)"
                    : "brightness(0) contrast(100%) blur(8px) opacity(0.5)",
                }}
              >
                {monsterData.emoji}
              </div>
            ) : null}
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
          <div className="space-y-1">
            {monsterData?.description && phase === "paywall" ? (
              <p className="text-sm font-medium text-white/90">{monsterData.description}</p>
            ) : null}
            <p className="text-sm text-white/62">{status}</p>
            {error ? <p className="text-sm text-error">{error}</p> : null}
          </div>

          {phase === "paywall" ? (
            <button
              type="button"
              onClick={() => {
                setPhase("draft");
                setMonsterData(null);
                setStatus("Вернулись к словам. Можно уточнить силуэт.");
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white/72 transition-colors hover:bg-white/[0.08]"
            >
              <RotateCcw className="h-4 w-4" />
              Edit words
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
