/**
 * Pure parental-consent policy shared by request gates and background work.
 * Keeping it free of Prisma makes every path apply the identical COPPA rule.
 */
export const CONSENT_VERSION = "2026-07-24";

export type ConsentValidityFields = {
  verifiedAt: Date | null;
  revokedAt: Date | null;
  serviceConsent: boolean;
  externalAiConsent: boolean;
  consentVersion: string;
};

export function isCurrentValidConsent(
  row: ConsentValidityFields | null | undefined
): boolean {
  return (
    row !== null &&
    row !== undefined &&
    row.verifiedAt !== null &&
    row.revokedAt === null &&
    row.serviceConsent === true &&
    row.externalAiConsent === true &&
    row.consentVersion === CONSENT_VERSION
  );
}
