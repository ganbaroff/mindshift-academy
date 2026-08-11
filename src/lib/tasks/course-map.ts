/**
 * One source of truth for "where am I on the course".
 *
 * Contract: `docs/architecture/08-UX-MONSTER-JOURNEY.md` §7 (steps 1 and 5) and §10.1.
 * The resume page, `/api/continue`, the map and the monster's earned parts all derive
 * from this list. Nothing may hardcode `w1-s1` again — that hardcoding is defect 2,
 * the returning child who restarts at step 1.
 *
 * Pure module: no Prisma, no Clerk, no React. Callers inject their own completion
 * predicate so this stays unit-testable without a database.
 */

export const SESSION_ORDER = [
  "w1-s1", "w1-s2", "w1-s3",
  "w2-s1", "w2-s2", "w2-s3",
  "w3-s1", "w3-s2", "w3-s3",
  "w4-s1", "w4-s2", "w4-s3",
  "w5-s1", "w5-s2", "w5-s3",
] as const;

export type CourseSessionId = (typeof SESSION_ORDER)[number];
export type WeekNumber = 1 | 2 | 3 | 4 | 5;

/**
 * Earned monster parts, in fixed order — one per completed week.
 * Source: `docs/design-handoff/v1.1/06-MONSTER-ANATOMY-ANSWERS.md` §1-2.
 * Each part is the proof of that week's skill, not decoration, and growth is
 * one-way (§4): a part is never taken back.
 */
export const MONSTER_PART_ORDER = [
  "ears",
  "arms",
  "horn",
  "backPattern",
  "wings",
] as const;

export type MonsterPartId = (typeof MONSTER_PART_ORDER)[number];

export type WeekMeta = {
  week: WeekNumber;
  /** The week's idea, in the child's language. */
  ideaRu: string;
  /** Part the monster grows when every session of the week is complete. */
  part: MonsterPartId;
  /** How the part is named to the child. */
  partRu: string;
  /**
   * The whole arrival phrase, not a noun glued to a verb at the call site. Russian
   * disagrees across these five parts — «выросли уши» but «вырос рог» and «появился
   * узор» — so a single template would print broken Russian to a child on three of the
   * five weeks. The sentence is content, so it lives with the content.
   */
  partGrownRu: string;
  /** What the new part lets the monster do — the reason the child earned it. */
  partMeaningRu: string;
};

export const COURSE_WEEKS: readonly WeekMeta[] = [
  {
    week: 1,
    ideaRu: "Точность",
    part: "ears",
    partRu: "уши",
    partGrownRu: "выросли уши",
    partMeaningRu: "Теперь он слышит тебя точнее.",
  },
  {
    week: 2,
    ideaRu: "Порядок",
    part: "arms",
    partRu: "руки",
    partGrownRu: "выросли руки",
    partMeaningRu: "Теперь он может делать шаги по порядку.",
  },
  {
    week: 3,
    ideaRu: "Правило",
    part: "horn",
    partRu: "рог",
    partGrownRu: "вырос рог",
    partMeaningRu: "Теперь он держит правило и не забывает его.",
  },
  {
    week: 4,
    ideaRu: "Образец",
    part: "backPattern",
    partRu: "узор на спине",
    partGrownRu: "появился узор на спине",
    partMeaningRu: "Теперь он повторяет образец сам.",
  },
  {
    week: 5,
    ideaRu: "Перенос",
    part: "wings",
    partRu: "крылья",
    partGrownRu: "выросли крылья",
    partMeaningRu: "Теперь он уносит то, чему научился, в новое место.",
  },
] as const;

export function isCourseSessionId(value: string): value is CourseSessionId {
  return (SESSION_ORDER as readonly string[]).includes(value);
}

/** `"w2-s3"` → 2. Returns null for anything not in the catalog. */
export function weekOfSession(sessionId: string): WeekNumber | null {
  if (!isCourseSessionId(sessionId)) return null;
  const week = Number(sessionId.slice(1, 2));
  return week >= 1 && week <= 5 ? (week as WeekNumber) : null;
}

/** `"w2-s3"` → 3. Returns null for anything not in the catalog. */
export function sessionNumberOf(sessionId: string): 1 | 2 | 3 | null {
  if (!isCourseSessionId(sessionId)) return null;
  const n = Number(sessionId.slice(4));
  return n === 1 || n === 2 || n === 3 ? n : null;
}

export function sessionsOfWeek(week: WeekNumber): CourseSessionId[] {
  return SESSION_ORDER.filter((id) => weekOfSession(id) === week);
}

export function weekMeta(week: WeekNumber): WeekMeta {
  const meta = COURSE_WEEKS.find((w) => w.week === week);
  if (!meta) throw new Error(`unknown course week: ${week}`);
  return meta;
}

/**
 * Pure resume derivation: the first session the child has not finished.
 * `null` means all fifteen are done — the caller decides where that lands.
 */
export function firstIncompleteSession(
  completedSessionIds: Iterable<string>
): CourseSessionId | null {
  const done = new Set(completedSessionIds);
  return SESSION_ORDER.find((id) => !done.has(id)) ?? null;
}

/**
 * Async twin of `firstIncompleteSession` for callers that must ask a database.
 * Checks in course order and stops at the first miss, so a child on week 1
 * costs one query, not fifteen.
 */
export async function resolveFirstIncompleteSession(
  isComplete: (sessionId: CourseSessionId) => Promise<boolean>
): Promise<CourseSessionId | null> {
  for (const id of SESSION_ORDER) {
    if (!(await isComplete(id))) return id;
  }
  return null;
}

/**
 * Parts the monster has earned: one per week whose three sessions are all complete.
 * Order is fixed (`MONSTER_PART_ORDER`) so the silhouette grows outward rather than
 * rearranging, and a later week never awards a part an earlier week has not.
 */
export function earnedMonsterParts(
  completedSessionIds: Iterable<string>
): MonsterPartId[] {
  const done = new Set(completedSessionIds);
  const parts: MonsterPartId[] = [];
  for (const meta of COURSE_WEEKS) {
    const weekDone = sessionsOfWeek(meta.week).every((id) => done.has(id));
    if (!weekDone) break;
    parts.push(meta.part);
  }
  return parts;
}

/**
 * The week a just-finished session closes — the growth moment — or null when the week
 * is still open and nothing grew.
 *
 * This is derivable from the session id alone because the course is strictly ordered:
 * `src/app/api/tasks/session/[id]/route.ts:76` refuses to serve a session whose
 * prerequisite is unfinished ("Сначала заверши предыдущую сессию."). Under that gate,
 * finishing the last session of week N means all three of week N are done, so week N's
 * part is exactly what was earned. Every other session closes nothing — a part is never
 * awarded early, and the last session of a week is the only place one can be awarded.
 *
 * `earnedMonsterParts` stays the source of truth for what the monster *has*; this only
 * answers what just *arrived*.
 */
export function weekClosedBy(sessionId: string): WeekMeta | null {
  const week = weekOfSession(sessionId);
  if (week === null) return null;
  const last = sessionsOfWeek(week).at(-1);
  return sessionId === last ? weekMeta(week) : null;
}

/**
 * Every part the monster wears once week `week` is closed, in growth order.
 * The celebration draws the monster from this, so it can never show a silhouette the
 * map would disagree with.
 */
export function monsterPartsThroughWeek(week: WeekNumber): MonsterPartId[] {
  return COURSE_WEEKS.filter((w) => w.week <= week).map((w) => w.part);
}

export type CourseStopState = "done" | "current" | "locked";

export type CourseStop = {
  sessionId: CourseSessionId;
  week: WeekNumber;
  session: 1 | 2 | 3;
  state: CourseStopState;
};

/**
 * The map, computed — never hardcoded.
 *
 * §10.1: the map reveals the *current cluster only* plus a compressed trail of what
 * is behind, so a child is never shown twelve locked dots. This returns every stop
 * with its state; the view decides how much of it to draw.
 */
export function courseStops(completedSessionIds: Iterable<string>): CourseStop[] {
  const done = new Set(completedSessionIds);
  const current = firstIncompleteSession(done);
  return SESSION_ORDER.map((sessionId) => ({
    sessionId,
    week: weekOfSession(sessionId) as WeekNumber,
    session: sessionNumberOf(sessionId) as 1 | 2 | 3,
    state: done.has(sessionId)
      ? ("done" as const)
      : sessionId === current
        ? ("current" as const)
        : ("locked" as const),
  }));
}
