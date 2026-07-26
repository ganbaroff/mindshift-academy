import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import WeeklyReport from "@/emails/weekly-report";
import { selectWeeklyReportRecipients } from "@/lib/weekly-report-recipients";
import { isCurrentValidConsent } from "@/lib/consent-policy";

// Vercel Cron: runs every Friday at 18:00 UTC (22:00 Baku)
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/weekly-report", "schedule": "0 18 * * 5" }] }

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // P1-D: fail CLOSED. When CRON_SECRET is unset OR the header doesn't match, reject.
  // (Old guard was fail-OPEN — anyone could trigger real parent emails when the secret
  // was absent, which it is by default.) This endpoint also emails a child's name/progress,
  // so leave it disabled in prod until the COPPA consent model is confirmed (CEO-gated).
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM?.trim();
  if (!resendKey || !resendFrom) {
    return NextResponse.json({
      ok: false,
      error: "Weekly-report email configuration is incomplete",
      hint: "Set RESEND_API_KEY and RESEND_FROM to enable email sending",
    }, { status: 503 });
  }

  const resend = new Resend(resendKey);

  try {
    const [users, consents] = await Promise.all([
      prisma.user.findMany({
        include: {
          monster: true,
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
      // selectWeeklyReportRecipients guarantees these fields. Keep the guard for
      // TypeScript narrowing should the database schema evolve independently.
      if (!user.monster) continue;

      const lessonsCompleted = user.progress.length;

      try {
        await resend.emails.send({
          from: resendFrom,
          to: parentEmail,
          subject: `${user.monster.name} ждёт — отчёт за неделю`,
          react: WeeklyReport({
            parentName: "Hörmətli valideyn",
            childName: user.username.split("@")[0],
            monsterName: user.monster.name,
            monsterEmoji: user.monster.emoji,
            lessonsCompleted,
            totalLessons: 5,
            xpEarned: user.xp,
            crystalsEarned: user.crystals,
            monsterMood: user.monster.mood,
            streak: user.streak,
          }),
        });
        sent++;
      } catch {
        // Do not return a child's alias, parent address, or provider detail in
        // an endpoint response. The cron caller only needs an aggregate error.
        errors.push("email_send_failed");
      }
    }

    return NextResponse.json({
      ok: true,
      processed: users.length,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[weekly-report] CRON failed:", error);
    return NextResponse.json(
      { error: "Weekly report CRON failed" },
      { status: 500 }
    );
  }
}
