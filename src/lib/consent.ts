import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { CONSENT_VERSION, isCurrentValidConsent } from "@/lib/consent-policy";

// COPPA parental-consent layer (docs/COPPA-CONSENT-SPEC.md).
// This module owns: (1) the fail-closed consent resolver used by every child-data gate,
// (2) the short-TTL email-verification code lifecycle (create / verify), and (3) recording
// + revoking the consent row. It NEVER stores a raw verification code.

// Current consent policy version (spec §4). Bump this string when the disclosure copy or the
// data flow materially changes — an old row whose consentVersion !== this is treated as
// NOT consented, so parents are re-prompted. Keep in sync with the /consent screen + emails.
export { CONSENT_VERSION };

// Verification code parameters (spec §3 step 3).
const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFY_ATTEMPTS = 5; // bound brute force of the 6-digit space
const CODE_MIN = 100000;
const CODE_RANGE = 900000; // 100000..999999 inclusive

/**
 * FAIL-CLOSED consent resolver (spec §4/§5).
 * Valid consent = row exists, verifiedAt != null, serviceConsent && externalAiConsent,
 * revokedAt == null, consentVersion current. ANY error (or missing clerkId) => NOT consented.
 * This is the single source of truth the /api/chat, lesson-chat, /api/monster and /api/tts
 * gates call before any child-data work or external-AI call.
 */
export async function hasValidConsent(
  clerkId: string | null | undefined
): Promise<boolean> {
  // Fail-closed: no identity => no consent.
  if (!clerkId) return false;
  try {
    const row = await prisma.parentalConsent.findUnique({ where: { clerkId } });
    if (!row) return false;
    return isCurrentValidConsent(row);
  } catch (err) {
    // Fail-closed: never let a DB/adapter error open the gate. Log type only (no child data).
    console.error(
      "[consent] resolution error (fail-closed → blocked):",
      (err as { name?: string })?.name ?? "Error"
    );
    return false;
  }
}

/** Read the current consent state for a parent-facing UI (safe subset, no code material). */
export async function getConsentStatus(clerkId: string): Promise<{
  exists: boolean;
  verified: boolean;
  serviceConsent: boolean;
  externalAiConsent: boolean;
  revoked: boolean;
  current: boolean;
  valid: boolean;
  parentEmail: string | null;
}> {
  try {
    const row = await prisma.parentalConsent.findUnique({ where: { clerkId } });
    if (!row) {
      return {
        exists: false,
        verified: false,
        serviceConsent: false,
        externalAiConsent: false,
        revoked: false,
        current: false,
        valid: false,
        parentEmail: null,
      };
    }
    const current = row.consentVersion === CONSENT_VERSION;
    const valid =
      row.verifiedAt !== null &&
      row.revokedAt === null &&
      row.serviceConsent &&
      row.externalAiConsent &&
      current;
    return {
      exists: true,
      verified: row.verifiedAt !== null,
      serviceConsent: row.serviceConsent,
      externalAiConsent: row.externalAiConsent,
      revoked: row.revokedAt !== null,
      current,
      valid,
      parentEmail: row.parentEmail,
    };
  } catch (err) {
    // Fail-closed for the UI too: report "not valid" on error.
    console.error(
      "[consent] status error:",
      (err as { name?: string })?.name ?? "Error"
    );
    return {
      exists: false,
      verified: false,
      serviceConsent: false,
      externalAiConsent: false,
      revoked: false,
      current: false,
      valid: false,
      parentEmail: null,
    };
  }
}

// --- Verification code lifecycle (hashed, single-use, 15-min TTL) ---

function hashCode(code: string, salt: string): string {
  // HMAC-SHA256 with a per-row random salt as the key. The raw code is never stored;
  // only this digest is. A pepper (CONSENT_CODE_PEPPER) is mixed in when present so a DB
  // leak alone can't offline-crack the (small) 6-digit space.
  const pepper = process.env.CONSENT_CODE_PEPPER ?? "";
  return crypto
    .createHmac("sha256", salt + pepper)
    .update(code)
    .digest("hex");
}

function generateCode(): string {
  // Cryptographically-random 6-digit code (100000..999999).
  return String(CODE_MIN + crypto.randomInt(CODE_RANGE));
}

/**
 * Create (or replace) the pending verification for an account and return the RAW code so the
 * caller can email it. The raw code is returned ONCE here and never persisted. Upserts on the
 * clerkId @unique key so a re-request overwrites any prior pending code (single active code).
 */
export async function createVerificationCode(
  clerkId: string,
  parentEmail: string
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const codeHash = hashCode(code, salt);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.consentVerification.upsert({
    where: { clerkId },
    update: {
      parentEmail,
      codeHash,
      salt,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      createdAt: new Date(),
    },
    create: { clerkId, parentEmail, codeHash, salt, expiresAt },
  });

  return { code, expiresAt };
}

/**
 * Verify a submitted code for an account. Constant-time compare against the stored hash.
 * Enforces: not expired, not already consumed, attempt cap. On success marks the row consumed
 * (single-use) and returns the parentEmail that was verified.
 */
export async function verifyCode(
  clerkId: string,
  code: string
): Promise<{ ok: boolean; parentEmail?: string; reason?: string }> {
  try {
    const row = await prisma.consentVerification.findUnique({ where: { clerkId } });
    if (!row) return { ok: false, reason: "no_code" };
    if (row.consumedAt) return { ok: false, reason: "already_used" };
    if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
    if (row.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

    const candidate = hashCode(code, row.salt);
    const a = Buffer.from(candidate);
    const b = Buffer.from(row.codeHash);
    const match = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!match) {
      await prisma.consentVerification.update({
        where: { clerkId },
        data: { attempts: { increment: 1 } },
      });
      return { ok: false, reason: "mismatch" };
    }

    // Single-use: consume the code atomically. A conditional updateMany (not a plain
    // update) ensures two concurrent requests that both matched the hash can't both
    // win — only the one that still sees consumedAt:null flips it. Closes the P0-02
    // double-redeem race (a plain update let both concurrent requests "succeed").
    const consumed = await prisma.consentVerification.updateMany({
      where: { clerkId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return { ok: false, reason: "already_used" };
    return { ok: true, parentEmail: row.parentEmail };
  } catch (err) {
    console.error(
      "[consent] verifyCode error:",
      (err as { name?: string })?.name ?? "Error"
    );
    return { ok: false, reason: "error" };
  }
}

/**
 * Record verified parental consent (spec §3 step 5). Requires BOTH opt-ins. Upserts the
 * ParentalConsent row with verifiedAt=now and clears any prior revocation / stale version.
 */
export async function recordConsent(params: {
  clerkId: string;
  parentEmail: string;
  serviceConsent: boolean;
  externalAiConsent: boolean;
  ipAddress?: string | null;
}): Promise<void> {
  const { clerkId, parentEmail, serviceConsent, externalAiConsent, ipAddress } = params;
  const now = new Date();
  await prisma.parentalConsent.upsert({
    where: { clerkId },
    update: {
      parentEmail,
      method: "email-plus",
      serviceConsent,
      externalAiConsent,
      consentVersion: CONSENT_VERSION,
      ipAddress: ipAddress ?? null,
      verifiedAt: now,
      revokedAt: null,
    },
    create: {
      clerkId,
      parentEmail,
      method: "email-plus",
      serviceConsent,
      externalAiConsent,
      consentVersion: CONSENT_VERSION,
      ipAddress: ipAddress ?? null,
      verifiedAt: now,
    },
  });
}

/** Revoke consent (spec §7): sets revokedAt, which immediately fails the gate. */
export async function revokeConsent(clerkId: string): Promise<boolean> {
  try {
    await prisma.parentalConsent.update({
      where: { clerkId },
      data: { revokedAt: new Date() },
    });
    return true;
  } catch (err) {
    console.error(
      "[consent] revoke error:",
      (err as { name?: string })?.name ?? "Error"
    );
    return false;
  }
}
