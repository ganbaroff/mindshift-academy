// STATE-OWNERSHIP SEAMS (STEP 0 of the server-authoritative-progression cure).
//
// Pure, importable units extracted from the lesson page (src/app/lesson/[id]/page.tsx)
// and the chat route (src/app/api/chat/route.ts). NO behavior change: each function is
// the exact logic that previously lived inline, moved behind a name so the offline
// (no-LLM, no-DB, no-React) regression suite can assert it deterministically.
//
// Why this file exists: progression is currently dual-recorded in two never-reconciled
// ledgers (client localStorage vs server DB). These seams are the join points the cure
// wires the product to so the SERVER becomes the single source of truth. Extracting them
// first lets the regression suite red-light the current bugs before any product logic moves.

// NOTE: this module intentionally has NO imports so it is resolvable BOTH by the Next
// bundler AND by the raw-Node regression harness (which does no tsconfig path-alias
// resolution and requires explicit file extensions for relative ESM imports). The reward
// numbers below are mirrored from curriculum.ts + the route.ts nextStep advance; a
// deterministic drift-guard in scripts/regression.mjs asserts they stay equal to the
// curriculum, so this mirror can never silently diverge from the single source.

// ---------------------------------------------------------------------------
// Lesson unlock / lock derivation (extracted verbatim from page.tsx ~L173-189).
// ---------------------------------------------------------------------------

export type LessonStatus = "completed" | "active" | "locked";

/**
 * The furthest lesson the child may reach: one past their highest COMPLETED lesson
 * (lesson 1 is always open). Derived from real per-lesson completion — NOT the current
 * position — so navigating backward never lowers it.
 */
export function maxUnlockedLesson(completedLessonIds: number[]): number {
  const highestCompleted = completedLessonIds.length ? Math.max(...completedLessonIds) : 0;
  return Math.max(1, highestCompleted + 1);
}

/**
 * Status of a single lesson tile given the child's completed set and the lesson they
 * are viewing. Byte-identical to the inline map body in page.tsx: the viewed lesson is
 * "active" unless already "completed"; any completed lesson stays "completed"; anything
 * up to maxUnlocked is "active"; the rest are "locked". Backward navigation to an earlier
 * lesson therefore never relocks later, already-completed lessons.
 */
export function lessonStatus(
  stepId: number,
  completedLessonIds: number[],
  viewedLessonId: number
): LessonStatus {
  const maxUnlocked = maxUnlockedLesson(completedLessonIds);
  const isDone = completedLessonIds.includes(stepId);
  if (stepId === viewedLessonId) {
    return isDone ? "completed" : "active";
  }
  if (isDone) return "completed";
  if (stepId <= maxUnlocked) return "active";
  return "locked";
}

/**
 * Whole-syllabus lock state: { stepId -> status } for the given step ids (default 1..5).
 * Pure function of (completed set, viewed lesson) so it can be asserted offline.
 */
export function deriveLockState(
  completedLessonIds: number[],
  viewedLessonId: number,
  stepIds: number[] = [1, 2, 3, 4, 5]
): Record<number, LessonStatus> {
  const out: Record<number, LessonStatus> = {};
  for (const id of stepIds) {
    out[id] = lessonStatus(id, completedLessonIds, viewedLessonId);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reward map (single numeric-step source). Mirrors the xp/crystals in curriculum.ts +
// the `nextStep` advance in route.ts updateUserRewards. Kept in lock-step with the
// curriculum by the STATE(reward-map) drift-guard in scripts/regression.mjs.
// ---------------------------------------------------------------------------

export interface StepReward {
  xp: number;
  crystals: number;
  /** The server step the child advances to on completion (clamped at the final lesson). */
  next: number;
}

/** Full lesson -> reward map. The single numeric-step reward source for client + gate. */
export const STEP_REWARD_MAP: Record<number, StepReward> = {
  1: { xp: 100, crystals: 10, next: 2 },
  2: { xp: 150, crystals: 15, next: 3 },
  3: { xp: 200, crystals: 20, next: 4 },
  4: { xp: 250, crystals: 30, next: 5 },
  5: { xp: 500, crystals: 100, next: 5 },
};

/** Reward + next-step for a numeric lesson step, or null for an unknown step. */
export function stepReward(stepId: number): StepReward | null {
  return STEP_REWARD_MAP[stepId] ?? null;
}

// ---------------------------------------------------------------------------
// Celebration / unlock predicate.
// ---------------------------------------------------------------------------

/**
 * Whether the "Задание выполнено" reward modal should open (and the lesson be marked
 * completed) for a chat response. TRUE only when the server actually GRANTED a reward
 * this turn (rewardTotals != null) — NOT on the pedagogy verdict (challengeCompleted)
 * alone. Replaying an already-completed lesson returns challengeCompleted=true but
 * rewardTotals=null (the server's anti-farm gate granted nothing), so this stays false
 * and no zero-XP "выполнено" modal fires. The tutor's in-character reply is shown either way.
 */
export function modalShouldOpen(
  challengeCompleted: boolean,
  rewardTotals: { xp: number; crystals: number } | null | undefined
): boolean {
  return challengeCompleted === true && rewardTotals != null;
}

// ---------------------------------------------------------------------------
// Server-authoritative reconcile: the /api/user contract -> completed lesson ids.
// ---------------------------------------------------------------------------

export interface LessonProgressRow {
  completed?: boolean | null;
  lesson?: { order?: number | null } | null;
}

/** Shape of the /api/user response the lesson page consumes on load. */
export interface UserApiPayload {
  activeStep?: number | null;
  /** Optional flattened form: the API may return the completed lesson orders directly. */
  completedLessonIds?: number[] | null;
  /** Or the raw LessonProgress rows (Prisma `progress: { include: { lesson: true } }`). */
  progress?: LessonProgressRow[] | null;
  monster?: unknown;
}

function dedupeSorted(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

/**
 * Rebuild the set of COMPLETED lesson ids from the server's /api/user response — the
 * server-authoritative reconcile the lesson page must apply on load so a fresh device /
 * re-login shows real progress instead of an empty (relocked) localStorage ledger.
 * Accepts either a flattened `completedLessonIds` array or raw `progress` rows.
 */
export function completedLessonIdsFromUser(payload: UserApiPayload | null | undefined): number[] {
  if (!payload) return [];
  if (Array.isArray(payload.completedLessonIds)) {
    return dedupeSorted(payload.completedLessonIds.filter((n): n is number => typeof n === "number"));
  }
  const rows = payload.progress ?? [];
  const ids = rows
    .filter((r) => r?.completed)
    .map((r) => r?.lesson?.order)
    .filter((n): n is number => typeof n === "number");
  return dedupeSorted(ids);
}

// ---------------------------------------------------------------------------
// Route.ts evaluation helpers — extracted so they are importable (were inline, private).
// Moved byte-identical from src/app/api/chat/route.ts. NO behavior change.
// ---------------------------------------------------------------------------

// Tiny keyword pre-filter blocklist (cheap fast-path; the real multilingual gate is
// moderate() in @/lib/moderation — unchanged and NOT touched here).
const BLOCKLIST = [
  "дурак", "дебил", "идиот", "лох", "сука", "бля", "хер", "хуй", "говно",
  "урод", "смерть", "убить", "секс", "порно", "наркотики", "сигареты", "алкоголь",
];

/**
 * Cheap keyword pre-filter (word-boundaried so "хер" no longer matches "Херсон").
 * The real multilingual safety gate is moderate(); this is only the fast-path pre-check.
 * SAFETY-NEUTRAL relocation: byte-identical to the former route.ts implementation.
 */
export function isSafePrompt(prompt: string): boolean {
  const lowercase = prompt.toLowerCase();
  return !BLOCKLIST.some((word) => new RegExp(`(^|[^а-яё])${word}([^а-яё]|$)`, "i").test(lowercase));
}

/**
 * Escape a client-supplied pet name/skin before it is spliced into the tutor system
 * prompt (prompt-injection hardening, P1-H). Escaping only — changes NOTHING about what
 * content is allowed. Byte-identical to the former route.ts implementation.
 */
export function sanitizeForPrompt(raw: string, max = 40): string {
  const cleaned = (raw ?? "")
    // strip ALL C0/C1 control chars (incl. CR/LF/TAB) -> cannot inject a new instruction line
    .replace(/[\x00-\x1F\x7F-\x9F]+/g, " ")
    // strip quotes/backticks/braces/angle-brackets -> cannot close the "..." slot or open a code block
    .replace(/["'`{}<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
  return cleaned || "Монстр"; // never empty -> placeholder
}

/**
 * Offline keyword fallback for the LLM-as-judge: whether the child's message plausibly
 * performs the given lesson's skill. Used ONLY when no AI provider is available or the
 * judge LLM times out. Byte-identical to the former route.ts implementation.
 *
 * DEPRECATED for the thinking curriculum: progression there is gated only by the
 * deterministic executor/checker (`src/lib/tasks/*`). Do not call this from new session
 * code. Kept for the legacy 5-lesson Module 1 chat path until that UI is retired.
 */
export function checkChallengeSuccess(prompt: string, stepId: number): boolean {
  const lowercase = prompt.toLowerCase();
  const words = lowercase.split(/\s+/).filter((w) => w.trim().length > 1);

  if (stepId === 1) {
    return words.length >= 3;
  }
  if (stepId === 2) {
    return lowercase.includes("пой") ||
           lowercase.includes("поё") ||
           lowercase.includes("песен") ||
           lowercase.includes("восторж") ||
           lowercase.includes("весел") ||
           lowercase.includes("рифм") ||
           lowercase.includes("радост") ||
           lowercase.includes("огонёк") ||
           lowercase.includes("стиль");
  }
  if (stepId === 3) {
    return lowercase.includes("звезд") ||
           lowercase.includes("звёзд") ||
           lowercase.includes("шифр") ||
           lowercase.includes("*") ||
           lowercase.includes("гласн") ||
           lowercase.includes("замен") ||
           lowercase.includes("код") ||
           lowercase.includes("символ") ||
           lowercase.includes("букв");
  }
  if (stepId === 4) {
    return lowercase.includes("нет") ||
           lowercase.includes("не") ||
           lowercase.includes("это") ||
           lowercase.includes("правильно") ||
           lowercase.includes("исправь") ||
           lowercase.includes("ошибка") ||
           lowercase.includes("собака") ||
           lowercase.includes("кошка");
  }
  if (stepId === 5) {
    const hasLogic = lowercase.includes("если") ||
                     lowercase.includes("тогда") ||
                     lowercase.includes("иначе") ||
                     lowercase.includes("if") ||
                     lowercase.includes("then") ||
                     lowercase.includes("else") ||
                     lowercase.includes("формат") ||
                     lowercase.includes("правило");
    return words.length >= 5 && hasLogic;
  }
  return false;
}
