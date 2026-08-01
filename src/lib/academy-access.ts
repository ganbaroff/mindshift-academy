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

/**
 * Signed-in continue path for "/" and "/enter-code" (W2 / NEW-04).
 * Never leaves a signed-in visitor on a dead code form when they already have a session.
 */
export type ContinuePathInput = AcademyEntryState & {
  /** Monster already hatched → skip onboarding hatch. */
  hasMonster: boolean;
  /** First incomplete thinking-curriculum session id, or null if all 15 done. */
  nextSessionId: string | null;
};

export type ContinuePath = {
  href: string;
  labelRu: string;
};

export function signedInContinuePath(input: ContinuePathInput): ContinuePath | null {
  if (!input.signedIn) return null;
  if (!input.allowed) {
    return { href: "/no-access", labelRu: "Нет доступа" };
  }
  if (!input.consentValid) {
    return { href: "/consent", labelRu: "Подтвердить согласие" };
  }
  if (!input.hasMonster) {
    return { href: "/onboarding", labelRu: "Продолжить знакомство" };
  }
  if (input.nextSessionId) {
    return {
      href: `/session/${input.nextSessionId}`,
      labelRu: "Продолжить обучение",
    };
  }
  return { href: "/dashboard", labelRu: "В кабинет родителя" };
}
