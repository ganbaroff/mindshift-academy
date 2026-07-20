import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  generateCode,
  normalizeCode,
  hashAccessValue,
  hashesEqual,
  CODE_LEN,
} from "@/lib/access-code-crypto";

// DB lifecycle for one-time child-access codes (spec §2). Pure crypto lives in
// ./access-code-crypto.ts (dependency-free + independently tested). This module owns the
// AccessCode row lifecycle: issue -> activate (parent) -> redeem (child). It never stores a raw
// code or activation token — only their HMAC digests (hashAccessValue).

const DEFAULT_TTL_DAYS = 30;

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Issue a code for an allowlisted parent email. Returns the RAW code + RAW activation token ONCE
 * (only their hashes are persisted). Caller (admin script) shows them to the operator and never
 * logs them elsewhere.
 */
export async function createAccessCode(
  issuedForEmail: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<{ id: string; code: string; activationToken: string }> {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const activationToken = randomToken();
  const activationSalt = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const row = await prisma.accessCode.create({
    data: {
      codeHash: hashAccessValue(code, salt),
      salt,
      issuedForEmail: issuedForEmail.trim().toLowerCase(),
      activationTokenHash: hashAccessValue(activationToken, activationSalt),
      activationSalt,
      expiresAt,
    },
  });
  return { id: row.id, code, activationToken };
}

/**
 * Resolve which row an activation token belongs to. The hash embeds a per-row salt, so we can't
 * hash-then-index — scan the small set of not-yet-redeemed rows and constant-time compare.
 */
export async function findActivationByToken(
  activationToken: string
): Promise<{ id: string; issuedForEmail: string; status: string } | null> {
  if (!activationToken) return null;
  const rows = await prisma.accessCode.findMany({
    where: { status: { in: ["issued", "active"] } },
    select: {
      id: true,
      issuedForEmail: true,
      status: true,
      activationTokenHash: true,
      activationSalt: true,
    },
  });
  for (const r of rows) {
    if (hashesEqual(hashAccessValue(activationToken, r.activationSalt), r.activationTokenHash)) {
      return { id: r.id, issuedForEmail: r.issuedForEmail, status: r.status };
    }
  }
  return null;
}

/** Parent activation: attach the Clerk user + captured consent and flip issued -> active. */
export async function activateAccessCode(
  activationToken: string,
  opts: {
    serviceConsent: boolean;
    externalAiConsent: boolean;
    clerkId: string;
    consentIp?: string | null;
  }
): Promise<{ ok: boolean; issuedForEmail?: string; reason?: string }> {
  const found = await findActivationByToken(activationToken);
  if (!found) return { ok: false, reason: "not_found" };
  if (found.status === "redeemed") return { ok: false, reason: "already_redeemed" };
  const updated = await prisma.accessCode.update({
    where: { id: found.id },
    data: {
      status: "active",
      clerkId: opts.clerkId,
      serviceConsent: opts.serviceConsent,
      externalAiConsent: opts.externalAiConsent,
      consentIp: opts.consentIp ?? null,
      activatedAt: new Date(),
    },
  });
  return { ok: true, issuedForEmail: updated.issuedForEmail };
}

/**
 * Child redemption: the code must be active (parent-activated) and unexpired. Single-use — an
 * atomic conditional update flips active -> redeemed so a double-tap/replay can't redeem twice.
 * Returns the clerkId to mint a sign-in ticket for.
 */
export async function redeemAccessCode(
  rawCode: string
): Promise<{ ok: boolean; clerkId?: string; reason?: string }> {
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LEN) return { ok: false, reason: "malformed" };
  const rows = await prisma.accessCode.findMany({
    where: { status: "active" },
    select: { id: true, codeHash: true, salt: true, clerkId: true, expiresAt: true },
  });
  for (const r of rows) {
    if (!hashesEqual(hashAccessValue(code, r.salt), r.codeHash)) continue;
    if (r.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
    if (!r.clerkId) return { ok: false, reason: "not_activated" };
    // Atomic single-use: only the update that still sees status:"active" wins the race.
    const res = await prisma.accessCode.updateMany({
      where: { id: r.id, status: "active" },
      data: { status: "redeemed", redeemedAt: new Date() },
    });
    if (res.count !== 1) return { ok: false, reason: "already_redeemed" };
    return { ok: true, clerkId: r.clerkId };
  }
  return { ok: false, reason: "invalid" };
}
