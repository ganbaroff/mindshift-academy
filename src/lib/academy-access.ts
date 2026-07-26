/**
 * Pure Academy-entry policy shared by the server layouts and deterministic tests.
 * Clerk owns the unauthenticated redirect; this helper decides only what a
 * signed-in visitor should see after the application has resolved access.
 */
export type AcademyEntryState = {
  signedIn: boolean;
  allowed: boolean;
  consentValid: boolean;
};

export function academyEntryRedirect({
  signedIn,
  allowed,
  consentValid,
}: AcademyEntryState): "/no-access" | "/consent" | null {
  if (!signedIn) return null;
  if (!allowed) return "/no-access";
  return consentValid ? null : "/consent";
}

/** Parent-facing consent has its own explicit route boundary. */
export function parentConsentRedirect({
  signedIn,
  allowed,
}: Pick<AcademyEntryState, "signedIn" | "allowed">): "/sign-in" | "/no-access" | null {
  if (!signedIn) return "/sign-in";
  if (!allowed) return "/no-access";
  return null;
}
