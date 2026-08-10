import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyMoodDecay, getMissedDays, shouldWarnParent } from "@/lib/retention-engine";
import { Errors } from "@/lib/errors";

// Vercel Cron: runs daily at 03:00 UTC (07:00 Baku)
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/mood-decay", "schedule": "0 3 * * *" }] }

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized triggers.
  // P1-D: fail CLOSED. When CRON_SECRET is unset OR the header doesn't match, reject.
  // (Old guard was fail-OPEN — anyone could mutate every monster.mood when the secret
  // was absent, which it is by default.)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
  }

  try {
    // Find all users with monsters
    const usersWithMonsters = await prisma.user.findMany({
      where: { monster: { isNot: null } },
      include: { monster: true },
    });

    let decayed = 0;
    let warned = 0;
    let alreadyZero = 0;

    for (const user of usersWithMonsters) {
      if (!user.monster) continue;

      const missedDays = getMissedDays(user.lastActive);

      if (missedDays === 0) continue; // Active today or yesterday — skip

      if (user.monster.mood === 0) {
        alreadyZero++;
        continue; // Already at rock bottom — shame-free, no further penalty
      }

      const newMood = applyMoodDecay(user.monster.mood, missedDays);

      await prisma.monster.update({
        where: { id: user.monster.id },
        data: { mood: newMood },
      });

      decayed++;

      if (shouldWarnParent(newMood)) {
        warned++;
      }
    }

    if (warned > 0) {
      console.warn("[mood-decay] parent-warning", { warned });
    }

    return NextResponse.json({
      ok: true,
      processed: usersWithMonsters.length,
      decayed,
      warned,
      alreadyZero,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[mood-decay] CRON failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json(
      { error: Errors.calmRetry },
      { status: 500 }
    );
  }
}
