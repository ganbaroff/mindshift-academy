/**
 * "Сообщить о проблеме" — one tap, on every page.
 *
 * A closed pilot with no feedback path is a pilot that learns nothing: a parent who hits
 * a broken screen at 8pm has, today, no way to tell us except finding the operator's
 * contact line and writing an email. This is the missing loop.
 *
 * The whole COPPA question lives in this file, and it is decided by the SERVER from the
 * path, never by the client:
 *
 *  - On a **child** surface the report carries NO free text. Ever. A child screen may not
 *    grow a box that ships typed words off the device; a child's text does not leave our
 *    servers before a parent has confirmed consent, and a "tell us what broke" field is
 *    exactly that box. One tap sends where and when, nothing else.
 *  - On a **parent** surface an optional short note is allowed, because the person typing
 *    is the account holder who can consent for themselves.
 *
 * Pure module: no Prisma, no Clerk, no network — so the rule above is unit-testable.
 */

export const PROBLEM_REPORT_MAX_NOTE = 300;
export const PROBLEM_REPORT_MAX_PATH = 120;

export type ReportSurface = "child" | "parent";

/** Every route a child touches unsupervised. */
const CHILD_PATH_PREFIXES = [
  "/session",
  "/lesson",
  "/onboarding",
  "/enter-code",
  "/certificate",
  "/start",
  // Added 2026-08-11. Both shipped as child screens and were classified as parent ones,
  // which is not cosmetic: `noteAllowed` opens the free-text field on a parent surface, so
  // the map and the resume door were offering an eight-year-old a box to type into that
  // exists only for a consenting adult. The wordmark reading «MindShift Academy» at them
  // was the visible half of the same bug.
  "/map",
  "/continue",
] as const;

export function classifySurface(path: string): ReportSurface {
  const clean = sanitizeReportPath(path);
  return CHILD_PATH_PREFIXES.some((p) => clean === p || clean.startsWith(`${p}/`))
    ? "child"
    : "parent";
}

/** A note is only ever accepted where the typist is the consenting adult. */
export function noteAllowed(surface: ReportSurface): boolean {
  return surface === "parent";
}

/**
 * Path only: no query string, no fragment, no host. A query string can carry anything a
 * link put there, so it is dropped whole rather than filtered.
 */
export function sanitizeReportPath(raw: string): string {
  const withoutQuery = String(raw ?? "").split("?")[0].split("#")[0].trim();
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const safe = normalized.replace(/[^a-zA-Z0-9/_-]/g, "");
  return (safe || "/").slice(0, PROBLEM_REPORT_MAX_PATH);
}

/**
 * Collapse control characters and whitespace, then cap. Never reached on a child surface.
 * Written as an explicit code-point filter rather than a regex class: the control range
 * is exactly the thing you cannot see in a diff if you get it wrong.
 */
export function sanitizeNote(raw: string | undefined): string {
  if (!raw) return "";
  const printable = Array.from(raw)
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 32;
      return code < 32 || code === 127 ? " " : ch;
    })
    .join("");
  return printable
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
    .slice(0, PROBLEM_REPORT_MAX_NOTE);
}

export type ProblemReportInput = {
  path: string;
  note?: string;
  /** Account holder, so the operator can answer. Absent behind the dev/test seam. */
  reporterEmail?: string | null;
  /** Release identity, so a report can be tied to what was actually deployed. */
  releaseId?: string | null;
};

export type ProblemReport = {
  surface: ReportSurface;
  path: string;
  note: string;
  noteDropped: boolean;
  text: string;
};

export function buildProblemReport(input: ProblemReportInput): ProblemReport {
  const path = sanitizeReportPath(input.path);
  const surface = classifySurface(path);
  const requested = sanitizeNote(input.note);
  const note = noteAllowed(surface) ? requested : "";
  const noteDropped = requested.length > 0 && note.length === 0;

  const lines = [
    "MindShift: сообщение о проблеме",
    `экран: ${path}`,
    `тип экрана: ${surface === "child" ? "детский" : "родительский"}`,
  ];
  if (input.reporterEmail) lines.push(`от: ${input.reporterEmail}`);
  if (input.releaseId) lines.push(`сборка: ${input.releaseId}`);
  if (note) lines.push(`комментарий: ${note}`);
  if (noteDropped) {
    lines.push("комментарий не передан: детский экран не отправляет свободный текст");
  }

  return { surface, path, note, noteDropped, text: lines.join("\n") };
}

/** Confirmations. No praise, no guilt, no promise we cannot keep. */
export const PROBLEM_REPORT_THANKS_RU = "Спасибо, я передал это взрослым.";
export const PROBLEM_REPORT_THANKS_PARENT_RU = "Спасибо — сообщение ушло оператору.";
export const PROBLEM_REPORT_LABEL_RU = "Сообщить о проблеме";
