import { prisma } from "@/lib/prisma";

// Helper to find or seed a lesson dynamically
export async function getOrCreateLesson(stepId: number) {
  let lesson = await prisma.lesson.findUnique({
    where: { order: stepId },
  });

  if (!lesson) {
    const details = [
      { title: "Пробуждение", desc: "Назови 3 качества монстра, чтобы согреть его и помочь вылупиться!" },
      { title: "Эмоциональный Спектр", desc: "Задай промпт-инструкцию о стиле речи дракончика: 'пой' или 'добавляй огонёк 🔥'." },
      { title: "Секретный Код", desc: "Напиши правило секретного кода, заменяющее все гласные буквы на звездочки." },
      { title: "Машинное зрение", desc: "Исправь зрение монстра через промпт-тюнинг (назови объект собакой)." },
      { title: "Финальный Квест", desc: "Напиши промпт с ветвлением логики IF/THEN, чтобы помочь дракончику пройти лабиринт." },
    ];
    const item = details[stepId - 1] || { title: `Урок ${stepId}`, desc: `Задание для шага ${stepId}` };

    lesson = await prisma.lesson.create({
      data: {
        order: stepId,
        title: item.title,
        description: item.desc,
        xpReward: stepId * 100,
        crystalRwd: stepId * 10,
      },
    });
  }

  return lesson;
}

// Helper to update user rewards and lesson progress in DB.
// DOUBLE-AWARD DEFENSE: two independent, ordered guards.
//   GUARD 1 (retry idempotency): when an eventId is supplied we first try to INSERT it as a
//   RewardEvent (eventId is the PK). A replayed SAME eventId throws P2002 → we skip the whole
//   award, so a network retry / F5-and-resend never double-increments xp/crystals.
//   GUARD 2 (per-lesson atomic dedup): we CREATE the LessonProgress row for this lesson. Because
//   LessonProgress is @@unique([userId, lessonId]) and is ONLY ever written here (always
//   completed:true), an EXISTING row == that lesson was already rewarded. A racing DISTINCT-eventId
//   completion of the SAME step (both pass the serverStep===activeStep gate before activeStep
//   advances) loses the CREATE race with P2002 → skips. This also covers lesson 5, whose nextStep
//   stays 5 (activeStep never changes), so a CAS on activeStep could not have stopped it.
// Returns the authoritative post-award totals { xp, crystals } so the client renders the SERVER
// value as the single source of truth. awarded=false when the award was skipped; totals still
// reflect current DB.
export async function updateUserRewards(
  userId: string,
  stepId: number,
  eventId?: string
): Promise<{ awarded: boolean; xp: number; crystals: number }> {
  try {
    // GUARD 1: retry idempotency (replayed SAME eventId).
    if (eventId) {
      try {
        await prisma.rewardEvent.create({ data: { eventId, userId, stepId } });
      } catch (e) {
        // P2002 = unique constraint (eventId already recorded) → this is a replay.
        if ((e as { code?: string })?.code === "P2002") {
          console.warn(`[rewards] duplicate eventId, skipping double-award (step ${stepId})`);
          // Return the CURRENT (already-awarded once) totals so the client still shows truth.
          const cur = await prisma.user.findUnique({
            where: { id: userId },
            select: { xp: true, crystals: true },
          });
          return { awarded: false, xp: cur?.xp ?? 0, crystals: cur?.crystals ?? 0 };
        }
        throw e;
      }
    }

    let xpGain = 0;
    let crystalsGain = 0;
    let nextStep = stepId;

    if (stepId === 1) {
      xpGain = 100;
      crystalsGain = 10;
      nextStep = 2;
    } else if (stepId === 2) {
      xpGain = 150;
      crystalsGain = 15;
      nextStep = 3;
    } else if (stepId === 3) {
      xpGain = 200;
      crystalsGain = 20;
      nextStep = 4;
    } else if (stepId === 4) {
      xpGain = 250;
      crystalsGain = 30;
      nextStep = 5;
    } else if (stepId === 5) {
      xpGain = 500;
      crystalsGain = 100;
      nextStep = 5;
    } else {
      // Unknown step → nothing to award.
      const cur = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, crystals: true },
      });
      return { awarded: false, xp: cur?.xp ?? 0, crystals: cur?.crystals ?? 0 };
    }

    // Ensure the lesson model is initialized in database (one Lesson row per step, order=stepId).
    const lesson = await getOrCreateLesson(stepId);

    // GUARD 2 (the fix): CREATE the per-lesson completion row. LessonProgress is
    // @@unique([userId, lessonId]) and only ever written here — so an existing row means this
    // lesson was ALREADY rewarded. P2002 == already rewarded (incl. a racing distinct-eventId
    // completion of the SAME step, and incl. lesson 5) → skip the increment. Other errors throw.
    try {
      await prisma.lessonProgress.create({
        data: {
          userId,
          lessonId: lesson.id,
          completed: true,
          completedAt: new Date(),
          score: 100,
        },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") {
        console.warn(`[rewards] lesson ${stepId} already completed, skipping double-award`);
        const cur = await prisma.user.findUnique({
          where: { id: userId },
          select: { xp: true, crystals: true },
        });
        return { awarded: false, xp: cur?.xp ?? 0, crystals: cur?.crystals ?? 0 };
      }
      throw e;
    }

    // Won BOTH guards → apply the award (returns the authoritative post-increment totals).
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xpGain },
        crystals: { increment: crystalsGain },
        activeStep: nextStep,
      },
      select: { xp: true, crystals: true },
    });

    return { awarded: true, xp: updated.xp, crystals: updated.crystals };
  } catch (err) {
    console.error("Database rewards update failed:", err);
    return { awarded: false, xp: 0, crystals: 0 };
  }
}
