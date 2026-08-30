"use client";

import { MonsterAvatar } from "@/components/companion/MonsterAvatar";
import type { PublicSessionContent, PublicContentTask } from "@/content/curriculum";

type SessionIntroProps = {
  session: PublicSessionContent;
  /** Session's first task — the "Готово, когда..." line describes THIS one. */
  firstTask: PublicContentTask | null;
  monsterColor?: string;
  onStart: () => void;
};

/**
 * Shown once, before the task board, so a child reads the story and the goal
 * before ever meeting a widget (top fix, docs/audit/WALKTHROUGH-UX-2026-08-29.md
 * #1 — "story hook → forward-phrased goal → «Готово, когда...» → CTA", the
 * Brilliant-style show-then-ask pattern).
 *
 * Deliberately thinner than the workspace it precedes (that audit's own
 * text-density finding): monster face, title, explanation, one done-when
 * line, one CTA — three text blocks, not eight. No new Russian copy is
 * authored here; every string is read from content that already exists
 * (`session.titleRu`, `session.explanationRu`, the first task's `doneWhenRu`
 * / `goalRu`).
 */
export function SessionIntro({ session, firstTask, monsterColor, onStart }: SessionIntroProps) {
  const doneWhen = firstTask?.doneWhenRu
    ? firstTask.doneWhenRu
    : firstTask?.goalRu
      ? `цель — ${firstTask.goalRu}`
      : null;

  return (
    <div
      className="flex w-full flex-1 flex-col items-center justify-center px-6 py-10 text-center"
      data-testid="session-intro"
    >
      <div className="w-full max-w-md space-y-6">
        <MonsterAvatar mood="happy" color={monsterColor} size={120} />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{session.titleRu}</h1>
        <p className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          {session.explanationRu}
        </p>
        {doneWhen ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Готово, когда...</span>{" "}
            {doneWhen}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onStart}
          data-testid="session-intro-start"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-base font-bold text-white transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
        >
          Начать →
        </button>
      </div>
    </div>
  );
}
