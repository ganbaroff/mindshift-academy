type ReportUser = {
  id: string;
  clerkId: string | null;
  monster: unknown | null;
};

type ReportConsent = {
  clerkId: string;
  parentEmail: string;
  verifiedAt: Date | null;
  revokedAt: Date | null;
  serviceConsent: boolean;
  externalAiConsent: boolean;
  consentVersion: string;
};

export type WeeklyReportRecipient<TUser extends ReportUser = ReportUser> = {
  user: TUser;
  parentEmail: string;
};

/**
 * Returns recipients for whom the parent has a current, verified, two-opt-in
 * consent record. `User.username` is deliberately never a delivery address:
 * it can be a child-visible alias and is not proof of parental verification.
 */
export function selectWeeklyReportRecipients<TUser extends ReportUser>(
  users: TUser[],
  consents: ReportConsent[],
  isValidConsent: (consent: ReportConsent) => boolean
): WeeklyReportRecipient<TUser>[] {
  const activeParentEmails = new Map<string, string>();
  for (const consent of consents) {
    const parentEmail = consent.parentEmail.trim().toLowerCase();
    if (isValidConsent(consent) && parentEmail) {
      activeParentEmails.set(consent.clerkId, parentEmail);
    }
  }

  return users.flatMap((user) => {
    if (!user.monster || !user.clerkId) return [];
    const parentEmail = activeParentEmails.get(user.clerkId);
    return parentEmail ? [{ user, parentEmail }] : [];
  });
}
