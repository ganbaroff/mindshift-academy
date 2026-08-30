"use client";

import { useCallback, useId } from "react";
import type { ReactNode } from "react";
import type { PublicContentTask } from "@/content/curriculum";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { ClaimSurface } from "./ClaimSurface";
import { GridDrawSurface } from "./GridDrawSurface";
import { PatternSurface } from "./PatternSurface";
import { RuleSurface } from "./RuleSurface";
import { SequenceSurface } from "./SequenceSurface";
import { WorkedExample } from "./WorkedExample";

export type TaskPrimaryActionState = {
  formId: string;
  ready: boolean;
};

type Props = {
  task: PublicContentTask;
  offeredTier: 1 | 2 | 3;
  disabled: boolean;
  reference?: ReactNode;
  externalPrimaryAction?: boolean;
  onPrimaryActionChange?: (state: TaskPrimaryActionState | null) => void;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
  /** Session's «Объяснение» — now folded into the single merged disclosure below,
   * instead of a separate always-rendered toggle in the session page header. */
  explanationRu?: string;
  /** Controlled from the session page (not local state) because a collision-task
   * miss force-expands it there, and the per-task-index reset lives there too. */
  showDisclosure: boolean;
  onToggleDisclosure: (next: boolean) => void;
};

const FAMILY_TITLES = {
  "grid-draw": "Собери точную картинку",
  "sequence-world": "Составь порядок действий",
  "rule-runner": "Создай правило «если — то»",
  "pattern-expand": "Задай короткое правило",
  "claim-check": "Проверь каждое утверждение",
} as const;

/**
 * What the tier withdraws (docs/CURRICULUM-STATUS-2026-08-11.md, «Возраст» §4).
 *
 * Until 2026-08-13 the tier changed exactly one thing — the «Коротко» line — so a child at
 * tier 3 solved a task identical to the one a child at tier 1 solved. That is not a ceiling,
 * it is a hidden hint. The ladder below withdraws the model itself:
 *
 *   tier 1 — worked example open on screen, plus the one-line reminder
 *   tier 2 — worked example present but folded, no reminder: help exists if asked for
 *   tier 3 — no worked example at all, and (sequence-world) the plan must be economical,
 *            which the server enforces in `applyTierThreeEconomy` — see src/lib/tasks/tier-demand.ts
 *
 * The prompt, the board and `doneWhenRu` never move: 08-UX-MONSTER-JOURNEY §10.2 fixed the
 * success condition as always-visible, and hiding the goal would make the task unfair, not harder.
 */
const WORKED_EXAMPLE_BY_TIER = {
  1: "open",
  2: "folded",
  3: "none",
} as const;

const TIER_THREE_DEMANDS: Partial<Record<keyof typeof FAMILY_TITLES, string>> = {
  "sequence-world": "На этом уровне план должен быть коротким: без повторов и без лишних шагов.",
};

const TIER_ONE_REMINDERS = {
  "grid-draw": "Нажимай только на те клетки, которые хочешь назвать монстру.",
  "sequence-world": "Монстр выполняет шаги сверху вниз и останавливается, если шаг невозможен.",
  "rule-runner": "Сначала посмотри, что впереди, потом выбери действие.",
  "pattern-expand": "Правило должно быть короче готового ряда и работать снова.",
  "claim-check": "Проверяй каждую фразу отдельно — уверенный голос не является доказательством.",
} as const;

export function TaskWorkspace({
  task,
  offeredTier,
  disabled,
  reference,
  externalPrimaryAction = false,
  onPrimaryActionChange,
  onSubmit,
  explanationRu,
  showDisclosure,
  onToggleDisclosure,
}: Props) {
  const formId = useId();
  const workedExample = WORKED_EXAMPLE_BY_TIER[offeredTier];
  const tierThreeDemand =
    offeredTier === 3 ? TIER_THREE_DEMANDS[task.family] : undefined;
  // §10.2's success condition, consolidated into ONE header line instead of two
  // separate blocks (page-level doneWhenRu paragraph + this component's own
  // level-heading/prompt caption). goalRu is the single prominent sentence; doneWhenRu
  // only earns its own line when it says something goalRu did not already say.
  const goalText = task.goalRu ?? task.promptRu;
  const showDoneWhenLine = Boolean(task.doneWhenRu) && task.doneWhenRu !== goalText;

  const handleSubmitReadyChange = useCallback(
    (ready: boolean) => {
      onPrimaryActionChange?.({ formId, ready });
    },
    [formId, onPrimaryActionChange]
  );

  const surfaceProps = {
    formId,
    hidePrimaryAction: externalPrimaryAction,
    onSubmitReadyChange: handleSubmitReadyChange,
    disabled,
    onSubmit,
  };

  const surface = task.family === "grid-draw"
    ? <GridDrawSurface {...surfaceProps} />
    : task.family === "sequence-world"
      ? <SequenceSurface {...surfaceProps} worldId={task.worldId} />
      : task.family === "rule-runner"
        ? <RuleSurface {...surfaceProps} maps={task.ruleMaps ?? []} />
        : task.family === "pattern-expand"
          ? <PatternSurface {...surfaceProps} expandCount={task.patternExpandCount} />
          : <ClaimSurface {...surfaceProps} claims={task.claims ?? []} />;

  return (
    <section
      data-testid={`task-workspace-${task.family}`}
      data-tier={offeredTier}
      data-worked-example={workedExample}
      aria-labelledby="task-workspace-title"
      className="space-y-3 rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-3 sm:space-y-4 sm:p-6"
    >
      {/* ONE task header (Sprint-1 text-density consolidation, plan §"one goal line +
          one disclosure"): goalRu is the single prominent sentence a child reads
          before anything else. This replaces two formerly-separate blocks — the
          session page's own doneWhenRu paragraph and this header's level-heading +
          prompt caption — with one. id moved here (from the old FAMILY_TITLES span)
          so aria-labelledby keeps resolving to an element that is always rendered. */}
      <header className="space-y-1 border-t border-[var(--border-color)] pt-3">
        <p
          id="task-workspace-title"
          data-testid="task-prompt-caption"
          className="text-sm font-semibold leading-6 text-[var(--text-primary)]"
        >
          {goalText}
        </p>
        {/* §10.2: the success condition must stay visible before the first attempt.
            When it says nothing goalRu didn't already say, it stays in the DOM
            (same testid, same text, e2e still finds it) but visually collapses to
            sr-only instead of printing a near-duplicate second sentence. */}
        <p
          data-testid="task-done-when"
          className={
            showDoneWhenLine
              ? "text-sm leading-5 text-[var(--text-secondary)]"
              : "sr-only"
          }
        >
          {task.doneWhenRu ?? "Смотри цель и собирай поле ниже — «Проверить» внизу."}
        </p>
      </header>

      {/* Task-first: target/reference visual right after the header, before any copy
          or the board, so phones see it above the fold. */}
      {reference}

      {/* «Что дано» stays visible for every family (not folded behind the disclosure
          below): tests/e2e/current-session-ui.mjs's assertReaskFlow waits on
          `task-given` being visible on a grid-draw task (w1-s1) before the child
          touches anything — "the brief must be readable before the child touches
          anything" — and pattern-expand/sequence-world read these chips as the
          material they act on. Deviating here from the sprint brief's "grid tasks
          only fold into disclosure" suggestion; called out in the sprint receipt. */}
      {task.givenRu?.length ? (
        <ul
          data-testid="task-given"
          aria-label="Что у тебя есть"
          className="flex flex-wrap gap-2"
        >
          {task.givenRu.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)]"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {/* ONE merged disclosure (Sprint-1): the session's «Объяснение», the level
          heading, promptRu (only when it says something goalRu above did not), the
          tier-1 «Коротко» reminder and the tier-3 demand — four to five previously
          separate always-rendered blocks — now live behind a single collapsed
          button. Post-collision auto-expand is unchanged: the session page still
          flips `showDisclosure` to true on a collision miss (state lives there). */}
      {showDisclosure ? (
        <div className="space-y-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-3">
          {explanationRu ? (
            <p className="rise-in text-sm leading-relaxed text-[var(--text-secondary)]">
              {explanationRu}
            </p>
          ) : null}
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary-dark)]">
            Уровень {offeredTier}
            <span className="text-[var(--text-muted)]"> · </span>
            {FAMILY_TITLES[task.family]}
          </p>
          {task.promptRu && task.promptRu !== goalText ? (
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{task.promptRu}</p>
          ) : null}
          {offeredTier === 1 ? (
            <p
              data-testid="task-tier-reminder"
              className="rounded-xl bg-[var(--color-secondary-soft)] p-2.5 text-xs leading-5 text-[var(--color-secondary-dark)] sm:text-sm"
            >
              <strong>Коротко:</strong> {TIER_ONE_REMINDERS[task.family]}
            </p>
          ) : null}
          {tierThreeDemand ? (
            <p
              data-testid="task-tier-demand"
              className="rounded-xl border border-[var(--color-primary-dark)]/30 p-2.5 text-xs leading-5 text-[var(--color-primary-dark)] sm:text-sm"
            >
              <strong>Условие уровня 3:</strong> {tierThreeDemand}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => onToggleDisclosure(false)}
            aria-expanded="true"
            data-testid="explanation-toggle"
            className="min-h-11 w-full rounded-xl px-2 text-left text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
          >
            Свернуть
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onToggleDisclosure(true)}
          aria-expanded="false"
          data-testid="explanation-toggle"
          className="flex min-h-11 w-full items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-2 text-left text-sm font-medium text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)]"
        >
          💡 Подсказки и объяснение
        </button>
      )}

      {surface}

      {workedExample === "none" ? null : (
        <WorkedExample
          family={task.family}
          initiallyOpen={workedExample === "open"}
        />
      )}
    </section>
  );
}
