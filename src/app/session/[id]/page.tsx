"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Loader2, Send, Lightbulb } from "lucide-react";
import confetti from "canvas-confetti";
import { Header } from "@/components/layout/Header";
import { DisplayGrid } from "@/components/curriculum/DisplayGrid";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";
import { sessionComplete } from "@/lib/tasks/session";
import type { PublicSessionContent, PublicContentTask } from "@/content/curriculum";
import { HINT_CRYSTAL_COST } from "@/content/curriculum";
import type { Cell } from "@/lib/tasks/types";
import { soundEngine } from "@/lib/sound-engine";
import { useGameStore } from "@/stores/game";

type TaskResult = {
  id: string;
  role: PublicContentTask["role"];
  pass: boolean;
  tier: number;
};

type AttemptResponse = {
  pass: boolean;
  feedback: string;
  programStatus: "ok" | "unclear";
  filledCells?: Cell[] | null;
  missingCells?: Cell[] | null;
  extraCells?: Cell[] | null;
  mastery?: number | null;
  crystals?: number | null;
  crystalsAwarded?: boolean | null;
  safetyPassed?: boolean;
  error?: string;
};

export default function ThinkingSessionPage() {
  const params = useParams();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const sessionId = typeof params.id === "string" ? params.id : "";
  const setCrystals = useGameStore((s) => s.setCrystals);
  const crystals = useGameStore((s) => s.crystals);

  const [session, setSession] = useState<PublicSessionContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lockedPrereq, setLockedPrereq] = useState<string | null>(null);
  const [nextSessionId, setNextSessionId] = useState<string | null>(null);
  const [taskIndex, setTaskIndex] = useState(0);
  const [results, setResults] = useState<TaskResult[]>([]);
  const [utterance, setUtterance] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filledCells, setFilledCells] = useState<Cell[]>([]);
  const [mismatchCells, setMismatchCells] = useState<Cell[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [revealedHint, setRevealedHint] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);
  const [consentEnded, setConsentEnded] = useState(false);
  const sendingRef = useRef(false);

  const safeIndex = session
    ? Math.min(Math.max(0, taskIndex), Math.max(0, session.tasks.length - 1))
    : 0;
  const currentTask = session?.tasks[safeIndex] ?? null;
  const pastLastWithoutComplete =
    Boolean(session) && taskIndex >= (session?.tasks.length ?? 0);

  const done = useMemo(() => {
    if (!session) return false;
    return sessionComplete(
      {
        id: session.id,
        concept: session.concept,
        practiceRequired: session.practiceRequired,
        requireTransfer: true,
        minTier: session.minTier,
      },
      results.map((r) => ({ ...r, role: r.role === "collision" ? "collision" : r.role }))
    );
  }, [session, results]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sessionRes, userRes] = await Promise.all([
          fetch(`/api/tasks/session/${encodeURIComponent(sessionId)}`),
          fetch("/api/user"),
        ]);
        if (!sessionRes.ok) {
          const body = (await sessionRes.json().catch(() => ({}))) as {
            error?: string;
            code?: string;
            prerequisiteSessionId?: string;
          };
          if (sessionRes.status === 403 && body.code === "CONSENT_REQUIRED") {
            if (!cancelled) setConsentEnded(true);
            return;
          }
          if (sessionRes.status === 403 && body.code === "SESSION_LOCKED") {
            if (!cancelled) {
              setLockedPrereq(body.prerequisiteSessionId ?? null);
              setLoadError(body.error ?? "Сначала заверши предыдущую сессию.");
            }
            return;
          }
          throw new Error(body.error ?? `HTTP ${sessionRes.status}`);
        }
        const body = (await sessionRes.json()) as {
          session: PublicSessionContent;
          passedTaskIds?: string[];
          crystals?: number;
          nextSessionId?: string | null;
        };
        if (!cancelled) {
          setSession(body.session);
          setNextSessionId(body.nextSessionId ?? null);
          if (Array.isArray(body.passedTaskIds) && body.passedTaskIds.length) {
            const byId = new Map(body.session.tasks.map((t) => [t.id, t]));
            setResults(
              body.passedTaskIds
                .map((id) => byId.get(id))
                .filter(Boolean)
                .map((t) => ({
                  id: t!.id,
                  role: t!.role,
                  pass: true,
                  tier: t!.tier,
                }))
            );
            const firstOpen = body.session.tasks.findIndex((t) => !body.passedTaskIds!.includes(t.id));
            if (firstOpen >= 0) setTaskIndex(firstOpen);
            else setTaskIndex(Math.max(0, body.session.tasks.length - 1));
          }
          if (typeof body.crystals === "number") setCrystals(body.crystals);
        }
        if (userRes.ok) {
          const user = (await userRes.json()) as { crystals?: number };
          if (!cancelled && typeof user.crystals === "number" && typeof body.crystals !== "number") {
            setCrystals(user.crystals);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Не удалось загрузить сессию");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, setCrystals, router]);

  const resetAttemptView = useCallback(() => {
    setFeedback(null);
    setFilledCells([]);
    setMismatchCells([]);
    setRevealedHint(null);
    setHintError(null);
  }, []);

  const advanceTask = useCallback(() => {
    if (!session) return;
    resetAttemptView();
    setUtterance("");
    setTaskIndex((i) => Math.min(i + 1, session.tasks.length));
  }, [resetAttemptView, session]);

  const revealHint = async () => {
    if (!session || !currentTask || hintBusy || revealedHint) return;
    setHintBusy(true);
    setHintError(null);
    try {
      const res = await fetch("/api/hints/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, taskId: currentTask.id }),
      });
      const data = (await res.json()) as {
        hintRu?: string;
        crystals?: number;
        error?: string;
        code?: string;
        cost?: number;
      };
      if (res.status === 403 && data.code === "CONSENT_REQUIRED") {
        setConsentEnded(true);
        return;
      }
      if (!res.ok) {
        setHintError(data.error ?? "Не удалось открыть подсказку.");
        if (typeof data.crystals === "number") setCrystals(data.crystals);
        return;
      }
      if (data.hintRu) setRevealedHint(data.hintRu);
      if (typeof data.crystals === "number") setCrystals(data.crystals);
      soundEngine.play("hint");
    } catch {
      setHintError("Связь потерялась. Попробуй ещё раз.");
    } finally {
      setHintBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentTask || sendingRef.current || !utterance.trim()) return;

    sendingRef.current = true;
    setIsSending(true);
    setFeedback(null);
    setFilledCells([]);
    setMismatchCells([]);

    try {
      // Server loads target/family/tier — client must not be trusted.
      const payload = {
        utterance: utterance.trim(),
        eventId: crypto.randomUUID(),
        sessionId: session.id,
        taskId: currentTask.id,
      };

      const res = await fetch("/api/tasks/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as AttemptResponse & { code?: string };

      if (res.status === 403 && data.code === "CONSENT_REQUIRED") {
        setConsentEnded(true);
        return;
      }

      if (!res.ok) {
        setFeedback(data.error ?? "Что-то пошло не так. Попробуй ещё раз.");
        return;
      }

      setFeedback(data.feedback);
      if (typeof data.crystals === "number") setCrystals(data.crystals);
      if (data.filledCells?.length) setFilledCells(data.filledCells);
      if (data.missingCells?.length || data.extraCells?.length) {
        setMismatchCells([...(data.missingCells ?? []), ...(data.extraCells ?? [])]);
      }

      const result: TaskResult = {
        id: currentTask.id,
        role: currentTask.role,
        pass: data.pass,
        tier: currentTask.tier,
      };
      setResults((prev) => [...prev.filter((r) => r.id !== currentTask.id), result]);

      if (currentTask.role === "collision") {
        setShowExplanation(true);
      }

      if (data.pass) {
        soundEngine.play("success");
        if (!prefersReducedMotion) {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ["#a78bfa", "#22d3ee"] });
        }
      } else {
        soundEngine.play("fail");
      }
    } catch {
      setFeedback("Связь потерялась. Подожди секунду и попробуй снова.");
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  if (consentEnded) {
    return (
      <div
        className="min-h-screen bg-[#090d16] text-white flex flex-col"
        data-testid="consent-ended-calm"
      >
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-5 max-w-md">
            <MonsterAvatar mood="thinking" color="#a78bfa" size={96} />
            <h1 className="text-2xl font-semibold">Сессия завершена</h1>
            <p className="text-sm text-white/70 leading-relaxed">
              Родитель закрыл доступ к обучению. Это спокойная пауза — прогресс
              сохранён. Когда согласие снова будет подтверждено, можно продолжить
              с того же места.
            </p>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-white"
            >
              На главный экран
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-violet-200">{loadError}</p>
            {lockedPrereq ? (
              <Link
                href={`/session/${lockedPrereq}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet-600 px-6 font-semibold hover:bg-violet-500"
              >
                Открыть предыдущую сессию
              </Link>
            ) : null}
            <div>
              <Link href="/dashboard" className="text-violet-300 underline">
                В кабинет
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" aria-label="Загрузка" />
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-8 text-center">
          <MonsterAvatar mood="happy" size={120} />
          <h1 className="text-3xl font-bold">Сессия пройдена!</h1>
          <p className="text-gray-300">{session.titleRu}</p>
          <p className="text-sm text-violet-200/80 bg-white/5 rounded-2xl p-4 border border-white/10">
            Вопрос за ужином: {session.dinnerQuestionRu}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {nextSessionId ? (
              <button
                type="button"
                onClick={() => router.push(`/session/${nextSessionId}`)}
                className="min-h-11 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 font-semibold"
              >
                Следующая сессия
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="min-h-11 px-6 py-3 rounded-full border border-white/15 hover:bg-white/5 font-semibold"
            >
              В кабинет
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (pastLastWithoutComplete) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-6 text-center">
          <MonsterAvatar mood="thinking" size={100} />
          <h1 className="text-2xl font-bold">Сессия ещё не завершена</h1>
          <p className="text-gray-300">
            Нужно пройти практику и перенос. Вернись к заданиям без галочки.
          </p>
          <button
            type="button"
            onClick={() => {
              const firstOpen = session.tasks.findIndex(
                (t) => !results.some((r) => r.id === t.id && r.pass)
              );
              setTaskIndex(firstOpen >= 0 ? firstOpen : 0);
              resetAttemptView();
            }}
            className="min-h-11 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 font-semibold"
          >
            Вернуться к заданиям
          </button>
        </main>
      </div>
    );
  }

  const progressLabel = `Задание ${safeIndex + 1} из ${session.tasks.length}`;
  // C3: collision target hidden until first attempt / explanation.
  const revealCollisionTarget =
    currentTask?.role !== "collision" || Boolean(feedback) || showExplanation;
  const gridTarget =
    currentTask?.family === "grid-draw" && revealCollisionTarget
      ? (currentTask.target ?? [])
      : [];
  const gridLabel =
    currentTask?.role === "collision" && !revealCollisionTarget
      ? "Пустое поле — скажи, что закрасить"
      : filledCells.length
        ? "Монстр закрасил так"
        : "Цель — совпасть с этой картинкой";

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <Link href="/dashboard" className="inline-flex items-center gap-1 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Назад
          </Link>
          <span aria-hidden="true">·</span>
          <span>
            Неделя {session.week}, сессия {session.session}
          </span>
        </div>

        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-violet-300/70">{progressLabel}</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{session.titleRu}</h1>
          <ol className="flex flex-wrap gap-2" aria-label="Прогресс заданий">
            {session.tasks.map((task, i) => {
              const doneTask = results.some((r) => r.id === task.id && r.pass);
              const current = i === safeIndex;
              return (
                <li key={task.id}>
                  <span
                    className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-xs font-bold border ${
                      doneTask
                        ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                        : current
                          ? "bg-violet-500/20 border-violet-400/50 text-white"
                          : "bg-white/5 border-white/10 text-gray-500"
                    }`}
                    aria-current={current ? "step" : undefined}
                    title={doneTask ? "Пройдено" : current ? "Сейчас" : `Задание ${i + 1}`}
                  >
                    {doneTask ? "✓" : i + 1}
                  </span>
                </li>
              );
            })}
          </ol>
          {currentTask && results.some((r) => r.id === currentTask.id && r.pass) ? (
            <p
              role="status"
              className="text-sm text-emerald-200/90 bg-emerald-500/10 border border-emerald-400/20 rounded-2xl px-4 py-3"
            >
              Это задание уже пройдено ✓. Повтор без новой награды — можно потренироваться или нажать
              «Дальше».
            </p>
          ) : null}
          {showExplanation ? (
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-gray-300 leading-relaxed bg-white/5 border border-white/10 rounded-2xl p-4"
            >
              {session.explanationRu}
            </motion.p>
          ) : null}
        </header>

        <section className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
          <MonsterAvatar mood={isSending ? "thinking" : "happy"} size={96} />
          <div className="space-y-4">
            <p className="text-lg leading-relaxed">{currentTask?.promptRu}</p>

            {currentTask?.family === "grid-draw" ? (
              <div className="space-y-2">
                <DisplayGrid
                  filled={filledCells}
                  target={gridTarget}
                  mismatch={mismatchCells}
                  label={gridLabel}
                />
                <p className="text-xs text-white/45">
                  Картинку смотри глазами — закрашивает монстр по твоим словам, не по клику.
                </p>
              </div>
            ) : null}

            {currentTask?.hintAvailable && !revealedHint ? (
              <button
                type="button"
                onClick={revealHint}
                disabled={hintBusy}
                className="min-h-11 px-4 py-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              >
                {hintBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                Подсказка · {HINT_CRYSTAL_COST}💎
                <span className="text-xs text-amber-200/70">(у тебя {crystals})</span>
              </button>
            ) : null}

            {revealedHint ? (
              <p className="text-sm leading-relaxed rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-100">
                {revealedHint}
              </p>
            ) : null}

            {hintError ? (
              <p role="alert" className="text-sm text-violet-200">
                {hintError}
              </p>
            ) : null}

            {feedback ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-200 bg-black/30 rounded-xl p-4 border border-white/5 font-mono leading-relaxed">
                {feedback}
              </pre>
            ) : null}

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <label className="sr-only" htmlFor="task-utterance">
                Твоя инструкция монстру
              </label>
              <input
                id="task-utterance"
                type="text"
                value={utterance}
                onChange={(e) => setUtterance(e.target.value)}
                disabled={isSending}
                maxLength={500}
                placeholder="Скажи монстру, что закрасить…"
                className="flex-1 min-h-11 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-violet-400/50 outline-none"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isSending || !utterance.trim()}
                className="min-h-11 min-w-[44px] px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>Отправить</span>
              </button>
            </form>

            {feedback && currentTask && results.some((r) => r.id === currentTask.id) ? (
              <button
                type="button"
                onClick={advanceTask}
                className="min-h-11 px-5 py-3 rounded-2xl border border-white/15 hover:bg-white/5 font-semibold"
              >
                {results.find((r) => r.id === currentTask.id)?.pass
                  ? "Дальше"
                  : "Попробовать ещё или дальше"}
              </button>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
