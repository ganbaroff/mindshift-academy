/**
 * Banned child-facing lexicon scan (engagement doc §3).
 * Used by W3 tests over new copy surfaces.
 */

export const BANNED_CHILD_LEXICON = [
  "ошибка",
  "проблема",
  "неправильно",
  "провал",
  "ты проиграл",
  "ты ошибся",
] as const;

export function findBannedLexicon(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_CHILD_LEXICON.filter((w) => lower.includes(w));
}

export function assertNoBannedLexicon(text: string, label = "copy"): void {
  const hits = findBannedLexicon(text);
  if (hits.length) {
    throw new Error(`Banned lexicon in ${label}: ${hits.join(", ")}`);
  }
}
