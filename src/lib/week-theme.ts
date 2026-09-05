/**
 * Per-week visual world themes (Sprint-2 task A, docs/owner plan of record).
 *
 * The five weeks of the curriculum share one beige/warm-paper base
 * (`globals.css` `--color-bg-base`) with no visual signal for which week a
 * child is in. This gives each week a light tint + accent + motif so the
 * board itself says "you are in a different world now" without touching
 * card surfaces or contrast: `--surface` stays the same everywhere, only the
 * page background and small accent chrome shift.
 *
 * Every `bgFrom`/`bgTo` pair is a light tint chosen so `--text-primary`
 * (#2B2320) keeps its normal-text contrast ratio against it — these are
 * gradient endpoints behind translucent/opaque `--surface` cards, not text
 * backgrounds themselves, so the ~4.5:1 target is a safety margin, not a
 * strict requirement.
 */

export type WeekNumber = 1 | 2 | 3 | 4 | 5;

export type WeekTheme = {
  nameRu: string;
  bgFrom: string;
  bgTo: string;
  accent: string;
  motif: string;
};

export const WEEK_THEMES: Record<WeekNumber, WeekTheme> = {
  1: { nameRu: "Мир слуха", bgFrom: "#EAF3FF", bgTo: "#F7FBFF", accent: "#3B82C4", motif: "\u{1F442}" },
  2: { nameRu: "Мир дома", bgFrom: "#FFF3E4", bgTo: "#FFE8CE", accent: "#E8823C", motif: "\u{1F6AA}" },
  3: { nameRu: "Мир коридора", bgFrom: "#ECEFF4", bgTo: "#E2E7F0", accent: "#5B6B8C", motif: "\u{1F9ED}" },
  4: { nameRu: "Мир узоров", bgFrom: "#F5EEFA", bgTo: "#ECE0F8", accent: "#8B6BFF", motif: "\u{1F9F5}" },
  5: { nameRu: "Мир неба", bgFrom: "#E8F7F2", bgTo: "#D9F2E8", accent: "#1FA398", motif: "\u{1FA7D}" },
};

const isWeekNumber = (n: number): n is WeekNumber => n >= 1 && n <= 5;

/** `themeForWeek(3)` -> week 3's theme. Falls back to week 1 for anything out of range,
 *  so a bad/legacy week number degrades to a theme rather than throwing. */
export function themeForWeek(week: number): WeekTheme {
  return WEEK_THEMES[isWeekNumber(week) ? week : 1];
}

/** `weekFromSessionId("w3-s1")` -> `3`. Session ids are always `w{week}-s{session}`
 *  (see `src/lib/tasks/course-map.ts`); returns `null` if the id doesn't match that shape
 *  so callers can fall back explicitly instead of silently theming as week 1. */
export function weekFromSessionId(sessionId: string): WeekNumber | null {
  const match = /^w(\d+)-s\d+$/.exec(sessionId);
  if (!match) return null;
  const week = Number(match[1]);
  return isWeekNumber(week) ? week : null;
}
