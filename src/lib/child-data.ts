import { prisma } from "@/lib/prisma";

export type ChildDataMutationResult = { found: boolean };

/**
 * Starts the Academy game over while preserving the verified parental-consent
 * record. Every gameplay mutation belongs to one transaction, so a failed
 * restart cannot leave a half-reset account.
 */
export async function restartChildData(clerkId: string): Promise<ChildDataMutationResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { clerkId } });
    if (!user) return { found: false };

    await tx.rewardEvent.deleteMany({ where: { userId: user.id } });
    await tx.taskAttempt.deleteMany({ where: { userId: user.id } });
    await tx.conceptMastery.deleteMany({ where: { userId: user.id } });
    await tx.atlasLearningSession.deleteMany({ where: { userId: user.id } });
    await tx.inventory.deleteMany({ where: { userId: user.id } });
    await tx.monster.deleteMany({ where: { userId: user.id } });
    await tx.lessonProgress.deleteMany({ where: { userId: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: { xp: 0, crystals: 0, streak: 0, activeStep: 1, lastActive: new Date() },
    });

    return { found: true };
  });
}

/**
 * Permanently removes Academy-held child data for the authenticated parent.
 * The Clerk account itself is deliberately retained: it belongs to the parent
 * and may be used to request access again, but no Academy child record remains.
 */
export async function deleteChildData(clerkId: string): Promise<ChildDataMutationResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { clerkId } });

    // Access codes carry PII (issuedForEmail) tied either to this account directly or to
    // the parent email on record. Erasure must remove both, or a code survives account
    // deletion and still resolves to the erased family's email on GET /access-code/activate.
    const consentRow = await tx.parentalConsent.findUnique({ where: { clerkId } });
    const accessCodes = await tx.accessCode.deleteMany({
      where: consentRow?.parentEmail
        ? { OR: [{ clerkId }, { issuedForEmail: consentRow.parentEmail }] }
        : { clerkId },
    });

    const [consent, verification] = await Promise.all([
      tx.parentalConsent.deleteMany({ where: { clerkId } }),
      tx.consentVerification.deleteMany({ where: { clerkId } }),
    ]);

    if (user) {
      // RewardEvent intentionally has no FK in the legacy schema, so delete it
      // explicitly before User deletion cascades monster, inventory, and progress.
      await tx.rewardEvent.deleteMany({ where: { userId: user.id } });
      await tx.taskAttempt.deleteMany({ where: { userId: user.id } });
      await tx.conceptMastery.deleteMany({ where: { userId: user.id } });
      await tx.atlasLearningSession.deleteMany({ where: { userId: user.id } });
      await tx.user.delete({ where: { id: user.id } });
    }

    return {
      found:
        Boolean(user) ||
        consent.count > 0 ||
        verification.count > 0 ||
        accessCodes.count > 0,
    };
  });
}
