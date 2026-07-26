import { createHash } from "node:crypto";

/**
 * Additive parent access grants that avoid putting a raw email in an env name.
 *
 * A production operator can grant one family access without downloading or
 * overwriting the legacy `ALLOWLIST_EMAILS` list:
 *
 *   ACADEMY_ALLOW_EMAIL_<SHA256(normalised-email)>=1
 *
 * The legacy bulk list remains supported during migration. The key contains a
 * deterministic digest rather than the parent's raw email address; it is an
 * operator convenience, not a password or a security boundary.
 */
export const PARENT_ALLOW_EMAIL_PREFIX = "ACADEMY_ALLOW_EMAIL_";

export function normalizeParentEmail(email) {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function parentAllowEmailEnvKey(email) {
  const normalized = normalizeParentEmail(email);
  if (!normalized) return null;

  const digest = createHash("sha256").update(normalized).digest("hex").toUpperCase();
  return `${PARENT_ALLOW_EMAIL_PREFIX}${digest}`;
}

function legacyAllowedEmails(env) {
  return (env.ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((email) => normalizeParentEmail(email))
    .filter(Boolean);
}

function isActiveGrant(value) {
  return value?.trim() === "1";
}

export function hasConfiguredParentAccess(env) {
  return (
    legacyAllowedEmails(env).length > 0 ||
    Object.keys(env).some((key) => key.startsWith(PARENT_ALLOW_EMAIL_PREFIX) && isActiveGrant(env[key]))
  );
}

/**
 * Production is closed unless at least one explicit grant is configured. A
 * local development environment remains open until an operator configures a
 * grant, preserving the previous developer ergonomics.
 */
export function isParentEmailAllowed(email, env = process.env) {
  const normalized = normalizeParentEmail(email);
  const legacy = legacyAllowedEmails(env);
  const key = parentAllowEmailEnvKey(normalized);

  if (!hasConfiguredParentAccess(env)) {
    return env.NODE_ENV !== "production";
  }
  if (!normalized) return false;

  return legacy.includes(normalized) || Boolean(key && isActiveGrant(env[key]));
}
