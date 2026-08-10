"use client";

/**
 * The pilot's feedback loop, in one control.
 *
 * Rules it obeys:
 *  - One tap is a complete report. Typing is optional and only offered where the server
 *    will accept it (parent screens) — a child never meets a text box here.
 *  - It never blocks the page and never sits over the sticky action bar: it lives on the
 *    opposite side of the screen from «Проверить», above the safe-area inset.
 *  - No guilt, no urgency, no "are you sure". Sending is one tap; saying nothing is free.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareWarning, Loader2 } from "lucide-react";
import {
  classifySurface,
  noteAllowed,
  PROBLEM_REPORT_LABEL_RU,
  PROBLEM_REPORT_MAX_NOTE,
  PROBLEM_REPORT_THANKS_PARENT_RU,
  PROBLEM_REPORT_THANKS_RU,
} from "@/lib/problem-report";

type Phase = "idle" | "open" | "sending" | "sent" | "anonymous" | "error";

export function ReportProblemButton() {
  const pathname = usePathname() ?? "/";
  /**
   * State is stamped with the screen it belongs to, and a screen change resets it during
   * render rather than in an effect. A half-typed note must never follow a parent onto
   * the next page, and an effect would let it render once before it is cleared.
   */
  const [state, setState] = useState({ path: pathname, phase: "idle" as Phase, note: "" });
  const current = state.path === pathname ? state : { path: pathname, phase: "idle" as Phase, note: "" };
  const { phase, note } = current;
  const setPhase = (next: Phase) => setState({ ...current, phase: next });
  const setNote = (next: string) => setState({ ...current, note: next });

  const surface = classifySurface(pathname);
  const canType = noteAllowed(surface);

  const send = async (withNote: string) => {
    setPhase("sending");
    try {
      const res = await fetch("/api/report-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, note: withNote || undefined }),
      });
      // 401 is its own answer: nobody to reply to. Say where to write instead of
      // pretending the tap worked. Never gate the button on client-side auth state —
      // a child mid-session whose Clerk client has not hydrated still needs this.
      setState({
        path: pathname,
        phase: res.ok ? "sent" : res.status === 401 ? "anonymous" : "error",
        note: withNote,
      });
    } catch {
      setState({ path: pathname, phase: "error", note: withNote });
    }
  };

  if (phase === "anonymous") {
    return (
      <p
        role="status"
        data-testid="report-problem-anonymous"
        className="fixed bottom-24 left-3 z-50 max-w-[16rem] rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-base)]/95 px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        Чтобы мы могли ответить, войди в аккаунт родителя — или напиши оператору со
        страницы «Родителям».
      </p>
    );
  }

  if (phase === "sent") {
    return (
      <p
        role="status"
        data-testid="report-problem-thanks"
        className="fixed bottom-24 left-3 z-50 max-w-[16rem] rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-base)]/95 px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {surface === "child" ? PROBLEM_REPORT_THANKS_RU : PROBLEM_REPORT_THANKS_PARENT_RU}
      </p>
    );
  }

  if (phase === "open" && canType) {
    return (
      <div
        data-testid="report-problem-form"
        // Origin-aware: this panel comes out of the button in the bottom-left corner, so
        // it grows from there rather than from its own centre.
        className="pop-from-corner fixed bottom-24 left-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] space-y-2 rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-base)]/95 p-3 backdrop-blur"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <label className="block text-xs text-[var(--text-muted)]" htmlFor="report-problem-note">
          Что пошло не так? Можно одним словом — или отправить без текста.
        </label>
        <textarea
          id="report-problem-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={PROBLEM_REPORT_MAX_NOTE}
          rows={3}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-2 text-base outline-none focus:border-[var(--color-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void send(note)}
            data-testid="report-problem-send"
            className="min-h-11 flex-1 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
          >
            Отправить
          </button>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="min-h-11 rounded-xl border border-[var(--border-color)] px-4 text-sm text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="report-problem"
      aria-label={PROBLEM_REPORT_LABEL_RU}
      disabled={phase === "sending"}
      onClick={() => (canType ? setPhase("open") : void send(""))}
      className="fixed bottom-24 left-3 z-50 inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--color-bg-base)]/90 px-3 text-xs text-[var(--text-muted)] backdrop-blur transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] disabled:opacity-50"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {phase === "sending" ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">
        {phase === "error" ? "Не ушло — нажми ещё раз" : PROBLEM_REPORT_LABEL_RU}
      </span>
    </button>
  );
}
