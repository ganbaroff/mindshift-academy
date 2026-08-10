/**
 * Public pilot-operator contact (shown on consent / dashboard / legal drafts).
 * Override via NEXT_PUBLIC_* only when the value is clean UTF-8 — never trust
 * env that was mangled to ASCII "?" (wrong-encoding Vercel/PowerShell writes).
 */

export const OPERATOR_NAME_DEFAULT = "Юсиф Ганбаров";
export const OPERATOR_EMAIL_DEFAULT = "yusif.ganbarov@volaura.app";
export const OPERATOR_PHONE_DEFAULT = "+994555857791";

const CYRILLIC = /[\u0400-\u04FF]/;
const CORRUPT = /\?{3,}|\uFFFD/;

export type OperatorContact = {
  name: string;
  email: string;
  phone: string;
};

/** Reject env values destroyed by wrong-encoding writes (??? / no Cyrillic). */
export function cleanEnvOverride(
  raw: string | undefined,
  fallback: string,
  opts: { requireCyrillic?: boolean } = {}
): string {
  const v = raw?.trim();
  if (!v) return fallback;
  if (CORRUPT.test(v)) return fallback;
  const qCount = (v.match(/\?/g) ?? []).length;
  if (qCount >= 3 && qCount / v.replace(/\s/g, "").length >= 0.4) return fallback;
  // Names: any "?" is corruption (e.g. "Юс?ф") — never show partial mojibake.
  if (opts.requireCyrillic && v.includes("?")) return fallback;
  if (opts.requireCyrillic && CYRILLIC.test(fallback) && !CYRILLIC.test(v)) {
    return fallback;
  }
  return v;
}

export function getOperatorContact(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): OperatorContact {
  return {
    name: cleanEnvOverride(env.NEXT_PUBLIC_OPERATOR_NAME, OPERATOR_NAME_DEFAULT, {
      requireCyrillic: true,
    }),
    email: cleanEnvOverride(env.NEXT_PUBLIC_OPERATOR_EMAIL, OPERATOR_EMAIL_DEFAULT),
    phone: cleanEnvOverride(env.NEXT_PUBLIC_OPERATOR_PHONE, OPERATOR_PHONE_DEFAULT),
  };
}
