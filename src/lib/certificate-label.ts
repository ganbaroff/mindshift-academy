/**
 * Certificate recipient label rules — Section 3A.3.
 * Default: "Участник MindShift V1".
 * Optional parent display label: max 32 chars, local filter, never AI / logs / metrics.
 */

export const DEFAULT_CERTIFICATE_LABEL = "Участник MindShift V1";
export const MAX_DISPLAY_LABEL_CHARS = 32;

/** Minimal local blocklist — Russian + Latin slur/profanity stubs (expandable). */
const BLOCKED = [
  "хуй",
  "пизд",
  "ебан",
  "сука",
  "бляд",
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "cunt",
];

export type LabelFilterResult =
  | { ok: true; label: string }
  | { ok: false; reason: "empty" | "too_long" | "blocked" | "invalid_chars" };

/**
 * Local validation + safety filter. Never log the raw input.
 * Returns DEFAULT when input is empty/whitespace (optional field omitted).
 */
export function filterCertificateDisplayLabel(
  raw: string | null | undefined
): LabelFilterResult {
  if (raw == null) {
    return { ok: true, label: DEFAULT_CERTIFICATE_LABEL };
  }
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { ok: true, label: DEFAULT_CERTIFICATE_LABEL };
  }
  if (trimmed.length > MAX_DISPLAY_LABEL_CHARS) {
    return { ok: false, reason: "too_long" };
  }
  // Allow letters (incl. Cyrillic), digits, spaces, hyphen, apostrophe, period.
  if (!/^[\p{L}\p{N} \-'.]+$/u.test(trimmed)) {
    return { ok: false, reason: "invalid_chars" };
  }
  const lower = trimmed.toLowerCase();
  if (BLOCKED.some((b) => lower.includes(b))) {
    return { ok: false, reason: "blocked" };
  }
  return { ok: true, label: trimmed };
}

/** Resolve printed label: filtered parent label or default. */
export function resolveCertificateLabel(
  parentDisplayLabel: string | null | undefined
): string {
  const filtered = filterCertificateDisplayLabel(parentDisplayLabel);
  if (!filtered.ok) return DEFAULT_CERTIFICATE_LABEL;
  return filtered.label;
}
