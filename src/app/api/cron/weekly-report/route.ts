import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import WeeklyReportV2 from "@/emails/weekly-report-v2";
import { selectWeeklyReportRecipients } from "@/lib/weekly-report-recipients";
import { isCurrentValidConsent } from "@/lib/consent-policy";
import { buildWeeklyReportV2 } from "@/lib/parent-reports";
import { Errors } from "@/lib/errors";

// Vercel Cron: runs every Friday at 18:00 UTC (22:00 Baku)
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/weekly-report", "schedule": "0 18 * * 5" }] }

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // P1-D: fail CLOSED. When CRON_SECRET is unset OR the header doesn't match, reject.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM?.trim();
  if (!resendKey || !resendFrom) {
    return NextResponse.json(
      {
        ok: false,
        error: Errors.unavailable,
        hint: "Set RESEND_API_KEY and RESEND_FROM to enable email sending",
      },
      { status: 503 }
    );
  }

  const resend = new Resend(resendKey);

  try {
    const [users, consents] = await Promise.all([
      prisma.user.findMany({
        include: {
          monster: true,
          conceptMasteries: true,
          progress: {
            where: { completed: true },
          },
        },
      }),
      prisma.parentalConsent.findMany({
        select: {
          clerkId: true,
          parentEmail: true,
          verifiedAt: true,
          revokedAt: true,
          serviceConsent: true,
          externalAiConsent: true,
          consentVersion: true,
        },
      }),
    ]);
    const recipients = selectWeeklyReportRecipients(users, consents, isCurrentValidConsent);

    let sent = 0;
    const skipped = users.length - recipients.length;
    const errors: string[] = [];

    for (const { user, parentEmail } of recipients) {
      if (!user.monster) continue;

      const masteryByConcept: Record<string, number> = {};
      for (const row of user.conceptMasteries ?? []) {
        masteryByConcept[row.concept] = row.mastery;
      }
      const week = Math.min(
        5,
        Math.max(1, Math.ceil(Math.max(1, user.progress.length) / 3))
      ) as 1 | 2 | 3 | 4 | 5;
      const snap = buildWeeklyReportV2(week, masteryByConcept);

      try {
        await resend.emails.send({
          from: resendFrom,
          to: parentEmail,
          subject: `Неделя ${week}: отчёт MindShift`,
          react: WeeklyReportV2({
            parentName: "Уважаемый родитель",
            childName: user.username.split("@")[0],
            monsterName: user.monster.name,
            week: snap.week,
            masteryPerSkill: snap.masteryPerSkill,
            struggledMost: snap.struggledMost,
            dinnerQuestionRu: snap.dinnerQuestionRu,
            misconceptionRu: snap.misconceptionRu,
          }),
        });
        sent++;
      } catch {
        errors.push("email_send_failed");
      }
    }

    return NextResponse.json({
      ok: true,
      processed: users.length,
      sent,
      skipped,
      errors: errors.length ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[weekly-report] CRON failed:", error);
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
