"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft, Loader2, Send, Lightbulb } from "lucide-react";
import confetti from "canvas-confetti";
import { Header } from "@/components/layout/Header";
import { DisplayGrid } from "@/components/curriculum/DisplayGrid";
import { TaskWorkspace, type TaskPrimaryActionState } from "@/components/curriculum/task-surfaces/TaskWorkspace";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";
import { SessionCoach } from "@/components/guide/SessionCoach";
import { TapHint } from "@/components/guide/TapHint";
import { useIdleNudge } from "@/components/guide/useIdleNudge";
import { MascotCue } from "@/components/guide/MascotCue";
import { CalmClosure } from "@/components/capstone/CalmClosure";
import { sessionComplete } from "@/lib/tasks/session";
import type { PublicSessionContent, PublicContentTask } from "@/content/curriculum";
import { HINT_CRYSTAL_COST } from "@/content/curriculum";
import type { Cell } from "@/lib/tasks/types";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { effectiveTaskTier } from "@/lib/tasks/tier-select";
import {
  clarify,
  clarifyMessage,
  CLARIFY_HELPER_RU,
  type ClarifyQuestion,
} from "@/lib/tasks/clarify";
import { isStuckOnTask, stuckNoticeRu, hintLabelRu } from "@/lib/tasks/stuck";
import { uxV11Enabled } from "@/lib/ux-flags";
import { soundEngine } from "@/lib/sound-engine";
import { useGameStore } from "@/stores/game";
import { CAPSTONE_SESSION_ID } from "@/lib/evolution";
import { DEFAULT_NUDGE } from "@/lib/guide";

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
  choiceMode?: boolean;
  choices?: { id: string; labelRu: string }[];
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
  const [offeredTier, setOfferedTier] = useState<1 | 2 | 3>(1);
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
  const [formulationText, setFormulationText] = useState("");
  const [formulationEcho, setFormulationEcho] = useState<string | null>(null);
  const [formulationBusy, setFormulationBusy] = useState(false);
  const [formulationError, setFormulationError] = useState<string | null>(null);
  const [certificateReady, setCertificateReady] = useState(false);
  const [choices, setChoices] = useState<{ id: string; labelRu: string }[] | null>(null);
  const [primaryAction, setPrimaryAction] = useState<TaskPrimaryActionState | null>(null);
  const [coachDismissed, setCoachDismissed] = useState(false);
  /**
   * The re-ask (08-UX-MONSTER-JOURNEY §3, §10.1). It is not an attempt: it never
   * reaches /api/tasks/attempt, records nothing and spends nothing. It appears as a
   * new message *under* the feedback — the child never watches their own answer
   * disappear — and their text stays editable in place.
   */
  const [reask, setReask] = useState<ClarifyQuestion | null>(null);
  const [reasksUsed, setReasksUsed] = useState(0);
  /** Consecutive misses on the current task — drives the unprompted, free help. */
  const [failStreak, setFailStreak] = useState(0);
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
        requireCollision: session.requireCollision,
        requirePrediction: session.requirePrediction,
        minTier: session.minTier,
      },
      results
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
          offeredTier?: 1 | 2 | 3;
        };
        if (!cancelled) {
          setSession(body.session);
          setNextSessionId(body.nextSessionId ?? null);
          setOfferedTier(body.offeredTier ?? 1);
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
  }, [sessionId, setCrystals]);

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
    // Re-ask budget and miss streak are per task, never carried forward: a child who
    // struggled once does not start the next task already counted as struggling.
    setReask(null);
    setReasksUsed(0);
    setFailStreak(0);
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
    if (!session || !currentTask || sendingRef.current) return;
    if (!utterance.trim()) return;

    await runAttempt({ utterance: utterance.trim() });
  };

  const runAttempt = async (opts: {
    utterance?: string;
    choiceId?: string;
    program?: StructuredProgram;
  }) => {
    if (!session || !currentTask || sendingRef.current) return;
    if (!opts.choiceId && !opts.program && !opts.utterance?.trim()) return;

    /**
     * Ask before grading. Deterministic, local, free — no request leaves the device,
     * so nothing is recorded, no crystal moves and no failure counter advances (§3).
     * Only free text can be ambiguous this way; a tapped grid or an ordered list has
     * already said exactly what it means.
     *
     * §10.3: an open re-ask owns the next submission. That submission closes it — and
     * is then graded normally, because the attempt it belongs to was never recorded.
     * If it is *still* ambiguous, clarify() returns the second, confirming question.
     */
    if (uxV11Enabled() && opts.utterance?.trim()) {
      const question = clarify({
        utterance: opts.utterance,
        family: currentTask.family,
        given: currentTask.givenRu,
        reasksUsed,
      });
      if (question) {
        setReask(question);
        setReasksUsed((n) => n + 1);
        return;
      }
    }
    setReask(null);

    sendingRef.current = true;
    setIsSending(true);
    setFeedback(null);
    setFilledCells([]);
    setMismatchCells([]);
    setChoices(null);

    try {
      const payload = {
        utterance: opts.utterance ?? "",
        choiceId: opts.choiceId,
        program: opts.program,
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
        setFeedback(data.error ?? "Что-то пошло не так. Попробуй ещё раз!");
        return;
      }

      setFeedback(data.feedback);
      if (data.choiceMode && data.choices?.length) {
        setChoices(data.choices);
      } else if (opts.choiceId || opts.program || data.pass) {
        setChoices(null);
      }
      if (typeof data.crystals === "number") setCrystals(data.crystals);
      if (data.filledCells?.length) setFilledCells(data.filledCells);
      if (data.missingCells?.length || data.extraCells?.length) {
        setMismatchCells([...(data.missingCells ?? []), ...(data.extraCells ?? [])]);
      }

      const result: TaskResult = {
        id: currentTask.id,
        role: currentTask.role,
        pass: data.pass,
        tier: effectiveTaskTier(currentTask.tier, offeredTier, currentTask.role),
      };
      setResults((prev) => [...prev.filter((r) => r.id !== currentTask.id), result]);

      if (currentTask.role === "collision") {
        setShowExplanation(true);
      }

      if (data.pass) {
        setFailStreak(0);
        soundEngine.play("success");
        if (!prefersReducedMotion) {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ["#a78bfa", "#22d3ee"] });
        }
      } else {
        setFailStreak((n) => n + 1);
        soundEngine.play("fail");
      }
    } catch {
      setFeedback("Связь потерялась. Подожди секунду и попробуй снова.");
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const showAdvancePreview =
    Boolean(feedback) &&
    Boolean(currentTask) &&
    results.some((r) => r.id === currentTask!.id);
  const idleNudgeEnabled =
    Boolean(session) &&
    Boolean(currentTask) &&
    !done &&
    !pastLastWithoutComplete &&
    !consentEnded &&
    !showAdvancePreview &&
    !(choices?.length) &&
    !isSending;
  const idleNudge = useIdleNudge(DEFAULT_NUDGE, idleNudgeEnabled);

  if (consentEnded) {
    return (
      <div
        className="min-h-screen bg-[var(--color-bg-base)] text-[var(--ink)] flex flex-col"
        data-testid="consent-ended-calm"
      >
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-5 max-w-md">
            <MonsterAvatar mood="thinking" color="#a78bfa" size={96} />
            <h1 className="text-2xl font-semibold">Сессия завершена</h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Родитель закрыл доступ к обучению. Это спокойная пауза — прогресс
              сохранён. Когда согласие снова будет подтверждено, можно продолжить
              с того же места.
            </p>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-[var(--ink)]"
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
      <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--ink)] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <p className="text-[var(--color-primary-dark)]">{loadError}</p>
            {lockedPrereq ? (
              <Link
                href={`/session/${lockedPrereq}`}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-violet-600 px-6 font-semibold hover:bg-[var(--color-primary)]"
              >
                Открыть предыдущую сессию
              </Link>
            ) : null}
            <div>
              <Link href="/dashboard" className="text-[var(--color-primary-dark)] underline">
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
      <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--ink)] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" aria-label="Загрузка" />
        </main>
      </div>
    );
  }

  if (done) {
    const isCapstone = session.id === CAPSTONE_SESSION_ID;

    if (isCapstone && formulationEcho) {
      return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--ink)]">
          <Header />
          <CalmClosure certificateReady={certificateReady || true} monsterName="Монстр" />
        </div>
      );
    }

    if (isCapstone) {
      return (
        <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--ink)]">
          <Header />
          <main className="max-w-2xl mx-auto px-6 py-12 space-y-6">
            <MonsterAvatar mood="celebrating" size={120} />
            <h1 className="text-3xl font-bold text-center">Итог: своими словами</h1>
            <p className="text-[var(--text-secondary)] text-center">
              Напиши главное правило мышления. Качество не мешает завершить путь — важно
              подать формулировку.
            </p>
            <textarea
              value={formulationText}
              onChange={(e) => setFormulationText(e.target.value)}
              rows={4}
              className="w-full rounded-2xl bg-[var(--surface-strong)] border border-[var(--border-color)] px-4 py-3 text-base text-[var(--ink)]"
              placeholder="Моё главное правило мышления…"
              data-testid="formulation-input"
            />
            {formulationError ? (
              <p className="text-sm text-[var(--color-primary-dark)]" role="alert">
                {formulationError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={formulationBusy}
              data-testid="formulation-submit"
              className="min-h-11 w-full px-6 py-3 rounded-full bg-violet-600 hover:bg-[var(--color-primary)] font-semibold disabled:opacity-50"
              onClick={async () => {
                setFormulationBusy(true);
                setFormulationError(null);
                try {
                  const res = await fetch("/api/formulation/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      utterance: formulationText,
                      sessionId: CAPSTONE_SESSION_ID,
                    }),
                  });
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setFormulationError(
                      typeof body.error === "string"
                        ? body.error
                        : "Не удалось сохранить. Попробуй ещё раз."
                    );
                    return;
                  }
                  setFormulationEcho(
                    typeof body.echo === "string" ? body.echo : formulationText
                  );
                  setCertificateReady(true);
                } finally {
                  setFormulationBusy(false);
                }
              }}
            >
              Подать формулировку
            </button>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--ink)]">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-8 text-center">
          <MonsterAvatar mood="happy" size={120} />
          <h1 className="text-3xl font-bold">Сессия пройдена!</h1>
          <p className="text-[var(--text-secondary)]">{session.titleRu}</p>
          <p className="text-sm text-[var(--color-primary-dark)]/80 bg-[var(--surface-strong)] rounded-2xl p-4 border border-[var(--border-color)]">
            Вопрос за ужином: {session.dinnerQuestionRu}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {nextSessionId ? (
              <button
                type="button"
                onClick={() => router.push(`/session/${nextSessionId}`)}
                className="min-h-11 px-6 py-3 rounded-full bg-violet-600 hover:bg-[var(--color-primary)] font-semibold"
              >
                Следующая сессия
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="min-h-11 px-6 py-3 rounded-full border border-[var(--border-color)] hover:bg-[var(--surface-strong)] font-semibold"
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
      <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--ink)]">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-6 text-center">
          <MonsterAvatar mood="thinking" size={100} />
          <h1 className="text-2xl font-bold">Сессия ещё не завершена</h1>
          <p className="text-[var(--text-secondary)]">
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
            className="min-h-11 px-6 py-3 rounded-full bg-violet-600 hover:bg-[var(--color-primary)] font-semibold"
          >
            Вернуться к заданиям
          </button>
        </main>
      </div>
    );
  }

  const progressLabel = `Задание ${safeIndex + 1} из ${session.tasks.length}`;
  // Always show the goal picture — hiding it on collision made "what do I paint?" impossible for kids.
  const gridTarget =
    currentTask?.family === "grid-draw" ? (currentTask.target ?? []) : [];
  const gridLabel = filledCells.length
    ? "Монстр закрасил так"
    : "Цель — совпасть с этой картинкой";

  // A FAILED task must keep its own Check button. Before this, any verdict — pass or
  // fail — replaced Check with a single button labelled "Попробовать ещё или дальше"
  // that only ever called advanceTask, so "попробовать ещё" silently meant "give up and
  // move on". A child had to walk the rest of the session and loop back to answer again.
  // Now: passed -> Дальше only; failed -> Check stays, with Пропустить beside it.
  const currentResult = results.find((r) => r.id === currentTask?.id);
  const passedCurrent = currentResult?.pass === true;
  const showAdvance = Boolean(feedback) && Boolean(currentTask) && Boolean(currentResult);
  const showStructuredCheck = !choices?.length && (!showAdvance || !passedCurrent);
  const checkDisabled =
    isSending || !primaryAction?.ready || !primaryAction?.formId;
  const advanceLabel = passedCurrent ? "Дальше" : "Пропустить";

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--text-primary)] flex flex-col">
      <Header />

      <div
        className="sticky top-12 z-40 border-b border-[var(--border-color)] bg-[var(--color-bg-base)]/90 backdrop-blur-xl motion-reduce:transition-none sm:top-[4.5rem]"
        data-testid="session-sticky-top"
      >
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 py-2">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Назад
          </Link>
          <p
            className="min-w-0 flex-1 truncate text-xs uppercase tracking-widest text-[var(--color-primary-dark)]/70"
            aria-live="polite"
            data-testid="session-progress-live"
          >
            {progressLabel}
          </p>
          <ol
            className="hidden shrink-0 gap-1.5 sm:flex"
            aria-label="Прогресс заданий"
          >
            {session.tasks.map((task, i) => {
              const doneTask = results.some((r) => r.id === task.id && r.pass);
              const current = i === safeIndex;
              return (
                <li key={task.id}>
                  <span
                    className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-[11px] font-bold border ${
                      doneTask
                        ? "bg-[var(--color-success-soft)] border-[var(--color-success)] text-[var(--color-success-dark)]"
                        : current
                          ? "bg-[var(--color-primary-soft)] border-[var(--color-primary-soft)] text-[var(--ink)]"
                          : "bg-[var(--surface-strong)] border-[var(--border-color)] text-[var(--text-muted)]"
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
        </div>
      </div>

      <main
        className="mx-auto w-full max-w-lg flex-1 space-y-3 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-2 sm:space-y-5 sm:pt-4"
        data-testid="session-scroll-main"
      >
        <header className="min-w-0">
          {/* `truncate` on the paragraph clips the ink but not the inline child boxes:
              at 320px the title's own box ran to 352px. A block child truncates inside
              its parent's width instead, so nothing sticks out of a real phone. */}
          <p className="text-xs text-[var(--text-muted)]">
            Неделя {session.week}, сессия {session.session}
          </p>
          <p className="block truncate text-xs text-[var(--text-secondary)]">{session.titleRu}</p>
          {currentTask && results.some((r) => r.id === currentTask.id && r.pass) ? (
            <p
              role="status"
              className="mt-2 rounded-2xl border border-[var(--color-success)] bg-[var(--color-success-soft)] px-3 py-2 text-sm text-[var(--color-success-dark)]"
            >
              Это задание уже пройдено ✓. Можно потренироваться или нажать «Дальше».
            </p>
          ) : null}
          {showExplanation ? (
            // Was a framer-motion `y` shorthand, which is not hardware-accelerated: it
            // runs on the main thread and drops frames exactly when the page is busy
            // fetching. Same motion, in CSS, off the main thread.
            <p className="rise-in mt-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {session.explanationRu}
            </p>
          ) : null}
        </header>

        <section className="grid items-start gap-3 sm:grid-cols-[auto_1fr] sm:gap-5">
          <div className="hidden sm:block">
            <MonsterAvatar mood={isSending ? "thinking" : "happy"} size={80} />
          </div>
          <div className="min-w-0 space-y-3 sm:space-y-4">
            {/* «Готово, когда» — one short line in the monster's voice, always visible
                before the first attempt. We refused to hide it until after a miss
                (§10.2): the defect that started this work was a child who could not
                tell what a finished answer looked like, and hiding the condition makes
                the first attempt a guess by design. No label, no third row to read. */}
            <div className="flex items-start gap-3">
              {/* The avatar is phone-only — a second monster already sits in the desktop
                  column. The line itself is visible at every width: it is the success
                  condition, and hiding it on a viewport is the same defect as hiding it
                  until after a miss. */}
              <div className="sm:hidden">
                <MonsterAvatar mood={isSending ? "thinking" : "happy"} size={48} />
              </div>
              <p className="pt-1 text-sm leading-5 text-[var(--text-secondary)]" data-testid="task-done-when">
                {currentTask?.doneWhenRu ?? "Смотри цель и собирай поле ниже — «Проверить» внизу."}
              </p>
            </div>
            {idleNudge >= 2 && showStructuredCheck ? (
              <MascotCue beat="sessionIdle" className="justify-start" />
            ) : null}
            {idleNudge >= 3 && showStructuredCheck && primaryAction?.ready ? (
              <p
                role="status"
                className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-[var(--color-secondary-dark)]"
              >
                Нажми «Проверить» внизу экрана.
              </p>
            ) : null}
            {currentTask ? (
              <TaskWorkspace
                key={currentTask.id}
                task={currentTask}
                offeredTier={offeredTier}
                disabled={isSending}
                externalPrimaryAction
                onPrimaryActionChange={setPrimaryAction}
                onSubmit={(program) => {
                  setCoachDismissed(true);
                  void runAttempt({ program });
                }}
                reference={currentTask.family === "grid-draw" ? (
                  <div className="space-y-1.5" aria-label="Образец текущего задания">
                    <DisplayGrid
                      filled={filledCells}
                      target={gridTarget}
                      mismatch={mismatchCells}
                      label={gridLabel}
                    />
                  </div>
                ) : undefined}
              />
            ) : null}
            {currentTask && !showAdvance ? (
              <SessionCoach
                family={currentTask.family}
                forceHide={coachDismissed || Boolean(feedback)}
                onDismissed={() => setCoachDismissed(true)}
              />
            ) : null}

            {revealedHint ? (
              <p className="text-sm leading-relaxed rounded-2xl border border-[var(--color-accent-dark)] bg-[var(--color-accent)] px-4 py-3 text-[#3A2600]">
                {revealedHint}
              </p>
            ) : null}

            {hintError ? (
              <p role="alert" className="text-sm text-[var(--color-primary-dark)]">
                {hintError}
              </p>
            ) : null}

            {feedback ? (
              <pre
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="whitespace-pre-wrap text-sm text-[var(--text-primary)] bg-[var(--surface-strong)] rounded-xl p-4 border border-[var(--border-color)] font-mono leading-relaxed"
              >
                {feedback}
              </pre>
            ) : null}

            {/* The full success condition, with its reasoning — the *expansion* after a
                miss, not the first appearance (§10.2). */}
            {failStreak > 0 && currentTask?.doneWhenFullRu ? (
              <p
                data-testid="task-done-when-full"
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]"
              >
                {currentTask.doneWhenFullRu}
              </p>
            ) : null}

            {/* The re-ask: a NEW message under the feedback, never replacing it, and
                never dressed as an error. The difference from a failure is carried by
                voice register — first person, curious — not by colour (§10.1). */}
            {reask ? (
              <div
                data-testid="monster-reask"
                role="status"
                aria-live="polite"
                className="rise-in flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3"
              >
                <MonsterAvatar mood="thinking" size={36} />
                <div className="min-w-0">
                  <p className="text-sm leading-6 text-slate-100">{clarifyMessage(reask)}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    {CLARIFY_HELPER_RU}
                  </p>
                </div>
              </div>
            ) : null}

            {/* The stuck child is never interrupted: no modal, no mode switch, no "are
                you struggling?". The monster names what it noticed in the same shape as
                any other message, and the hint stops costing anything (§10.1). */}
            {uxV11Enabled() && isStuckOnTask(failStreak) && !revealedHint ? (
              <div
                data-testid="stuck-notice"
                role="status"
                aria-live="polite"
                className="rise-in flex items-start gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3"
              >
                <MonsterAvatar mood="happy" size={36} />
                <div className="min-w-0 space-y-2">
                  <p className="text-sm leading-6 text-slate-100">{stuckNoticeRu(failStreak)}</p>
                  {currentTask?.hintAvailable ? (
                    <button
                      type="button"
                      onClick={revealHint}
                      disabled={hintBusy}
                      data-testid="stuck-free-hint"
                      className="min-h-11 rounded-2xl border border-[var(--color-accent-dark)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#3A2600] transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:opacity-50"
                    >
                      Показать подсказку · бесплатно
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {choices?.length ? (
              <div
                className="space-y-2"
                data-testid="choice-mode"
                role="group"
                aria-label="Варианты без голоса монстра"
              >
                <p className="text-sm text-[var(--text-secondary)]">Выбери вариант:</p>
                {choices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isSending}
                    data-testid={`choice-${c.id}`}
                    onClick={() => void runAttempt({ choiceId: c.id })}
                    className="w-full min-h-11 px-4 py-3 rounded-2xl border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] text-left font-semibold hover:bg-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:opacity-50"
                  >
                    {c.labelRu}
                  </button>
                ))}
              </div>
            ) : null}

            <details className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-secondary-dark)]">
                Сказать своими словами
              </summary>
              <p className="mb-3 text-sm leading-6 text-[var(--text-muted)]">
                Это дополнительный способ. Основное задание можно выполнить в понятном поле выше.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
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
                  placeholder="Скажи монстру, что сделать…"
                  className="min-h-11 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-base outline-none focus:border-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={isSending || !utterance.trim()}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl border border-[var(--color-primary-soft)] px-5 py-3 font-semibold text-[var(--color-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
                  <span>Отправить текст</span>
                </button>
              </form>
            </details>
          </div>
        </section>
      </main>

      <footer
        className="sticky bottom-0 z-40 border-t border-[var(--border-color)] bg-[var(--color-bg-base)]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)] motion-reduce:transition-none"
        data-testid="session-action-bar"
      >
        <div className="mx-auto flex w-full max-w-lg items-stretch gap-2 px-4 py-3">
          {currentTask?.hintAvailable && !revealedHint ? (
            <button
              type="button"
              onClick={revealHint}
              disabled={hintBusy}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--color-accent-dark)] bg-[var(--color-accent)] px-3 text-sm font-semibold text-[#3A2600] transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:opacity-50 sm:px-4"
            >
              {hintBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="sr-only sm:not-sr-only">Подсказка ·</span>
              {/* The price the child will actually pay. A stuck child pays nothing, and
                  the server decides that from recorded misses — this label only reports it. */}
              <span>
                {uxV11Enabled()
                  ? hintLabelRu(failStreak, HINT_CRYSTAL_COST)
                  : `${HINT_CRYSTAL_COST}💎`}
              </span>
              {uxV11Enabled() && isStuckOnTask(failStreak) ? null : (
                <span className="text-xs text-[var(--text-muted)]">({crystals})</span>
              )}
            </button>
          ) : null}

          {/* Two independent slots, not one either/or ternary. The ternary was why the
              previous attempt at this fix did nothing: showAdvance is true after ANY
              verdict, so it always won the branch and the Check button below was
              unreachable. Unanswered -> Check. Failed -> Check AND Пропустить. Passed ->
              Дальше alone. */}
          {showStructuredCheck ? (
            <span className="relative inline-flex min-w-0 flex-1">
              <TapHint
                show={
                  idleNudge >= 1 &&
                  Boolean(primaryAction?.ready) &&
                  !checkDisabled
                }
              />
              <button
                type="submit"
                form={primaryAction?.formId}
                disabled={checkDisabled}
                data-testid="session-primary-check"
                className="relative z-10 min-h-11 w-full flex-1 rounded-2xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Проверяем…
                  </span>
                ) : (
                  "Проверить"
                )}
              </button>
            </span>
          ) : null}

          {showAdvance ? (
            <button
              type="button"
              onClick={advanceTask}
              className="min-h-11 flex-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-5 py-3 font-semibold transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:bg-[var(--surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
            >
              {advanceLabel}
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
