/**
 * Public pilot-access request funnel (parent-submitted).
 *
 * Pure policy + shaping only: no Prisma, no fetch — so the deterministic test runner can
 * import it under plain node. The route owns persistence and the operator alert.
 *
 * COPPA posture: this form is ADULT-facing. It must never ask for, nor persist, anything
 * about the child (no name, no age, no school). The free-text note is length-capped and is
 * shown to the operator only.
 */

export const ACCESS_REQUEST_LIMITS = {
  email: 120,
  parentName: 60,
  note: 300,
} as const;

/**
 * Deliberately boring: catches typos, not an RFC parser. The character class is a whitelist
 * rather than "anything but @ and space" because the address is rendered into an operator-facing
 * alert next to a shell command — `x;whoami@a.b` is a valid-looking address and a paste-ready
 * trap. Rare-but-legal local parts (quoted strings, exotic punctuation) are rejected on purpose.
 */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

export function normalizeRequestEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value || value.length > ACCESS_REQUEST_LIMITS.email) return null;
  return EMAIL_RE.test(value) ? value : null;
}

/** Trim, collapse whitespace/newlines, hard-cap. Empty becomes null (never an empty string row). */
export function clampText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return value || null;
}

export type AccessRequestInput = {
  email: string;
  parentName: string | null;
  note: string | null;
};

export type AccessRequestParse =
  | { ok: true; value: AccessRequestInput }
  | { ok: false; reason: "email" | "bot" };

/**
 * `website` is a honeypot: a hidden field no human fills in. Any value = drop the submission
 * silently (the caller still answers 200 so a bot learns nothing).
 */
export function parseAccessRequest(body: unknown): AccessRequestParse {
  const input = (body ?? {}) as Record<string, unknown>;
  if (typeof input.website === "string" && input.website.trim()) {
    return { ok: false, reason: "bot" };
  }
  const email = normalizeRequestEmail(input.email);
  if (!email) return { ok: false, reason: "email" };

  return {
    ok: true,
    value: {
      email,
      parentName: clampText(input.parentName, ACCESS_REQUEST_LIMITS.parentName),
      note: clampText(input.note, ACCESS_REQUEST_LIMITS.note),
    },
  };
}

/** Server logs must never carry a full parent address. */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}

/**
 * Operator alert body (Telegram, plain text — no markdown so an apostrophe can't break parsing).
 * The operator needs the real address to approve, so it is sent in full to the operator channel
 * only. Nothing about a child can appear here, because nothing about a child is collected.
 */
export function operatorAlertText(input: AccessRequestInput, appUrl?: string): string {
  const lines = [
    "MindShift: новая заявка на доступ",
    `Почта: ${input.email}`,
  ];
  if (input.parentName) lines.push(`Имя: ${input.parentName}`);
  if (input.note) lines.push(`Сообщение: ${input.note}`);
  lines.push("");
  // Quoted so a copy-pasted command can never be split by the address, even if the validator
  // is ever loosened again.
  lines.push(`Одобрить: node scripts/approve-access-request.mjs "${input.email}"`);
  if (appUrl) lines.push(appUrl);
  return lines.join("\n");
}
