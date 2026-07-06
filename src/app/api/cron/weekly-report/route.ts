import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import WeeklyReport from "@/emails/weekly-report";

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
  if (!resendKey) {
    return NextResponse.json({
      ok: false,
      error: "RESEND_API_KEY not configured",
      hint: "Set RESEND_API_KEY in .env to enable email sending",
    }, { status: 503 });
  }

  const resend = new Resend(resendKey);

  try {
    const users = await prisma.user.findMany({
      include: {
        monster: true,
        progress: {
          where: { completed: true },
        },
      },
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const user of users) {
      // Skip users without monsters (not fully onboarded)
      if (!user.monster) {
        skipped++;
        continue;
      }

      // Skip users with no email-like username
      if (!user.username.includes("@")) {
        skipped++;
        continue;
      }

      const lessonsCompleted = user.progress.length;

      try {
        await resend.emails.send({
          from: "MindShift Academy <noreply@mindshift.academy>",
          to: user.username,
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
      } catch (emailError) {
        errors.push(`${user.username}: ${emailError}`);
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
