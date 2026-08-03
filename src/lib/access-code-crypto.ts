import crypto from "node:crypto";

// PURE code-crypto for one-time child-access codes (spec §2/§8). Deliberately dependency-free
// (only node:crypto) so the deterministic test lane can import + exercise it with no DB/Next —
// matching how every other pure lib in this repo is tested. The DB lifecycle lives in
// ./access-code.ts, which imports these helpers.

// Kid-safe alphabet: excludes 0 O 1 I L to avoid the ClassDojo "O vs 0, I vs l" mistype failure
// (see spec §2 / research). 30 chars, length 8 ⇒ ~39 bits — unguessable under a rate-limited redeem.
export const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LEN = 8;

/** Cryptographically-random 8-char code from the kid-safe alphabet. */
export function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

/** Uppercase and keep only alphabet chars — forgiving of spaces, dashes, and case in child input. */
export function normalizeCode(raw: string): string {
  return (raw || "")
    .toUpperCase()
    .split("")
    .filter((c) => ALPHABET.includes(c))
    .join("");
}

/**
 * HMAC-SHA256(value, salt + CONSENT_CODE_PEPPER). Raw codes / activation tokens are NEVER stored
 * — only this digest. Mirrors src/lib/consent.ts hashCode: per-row random salt as the HMAC key,
 * plus a process-wide pepper so a DB leak alone can't offline-crack the code space.
 */
export function hashAccessValue(value: string, salt: string): string {
  const pepper = requirePepper();
  return crypto.createHmac("sha256", salt + pepper).update(value).digest("hex");
}

/**
 * The pepper is what makes a stolen database useless on its own. Defaulting it to "" turned a
 * missing production variable into a silent downgrade — every digest still looked fine while the
 * offline-cracking protection was gone, and existing rows (hashed WITH a pepper) would stop
 * matching. Fail loudly in production instead; development stays usable without one.
 */
export function requirePepper(env: NodeJS.ProcessEnv = process.env): string {
  const pepper = env.CONSENT_CODE_PEPPER ?? "";
  if (!pepper && env.NODE_ENV === "production") {
    throw new Error("CONSENT_CODE_PEPPER is not set in production — refusing to hash without it.");
  }
  return pepper;
}

/** Constant-time hash compare (timing-safe), false on any length mismatch. */
export function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
