import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Reset disabled in production" }, { status: 403 });
  }

  try {
    // Reset default user stats in SQLite database
    // "Start over" = a genuinely fresh child state (0/0/0), matching every other
    // create path (user/monster/chat routes). The old 450/120/3 here silently
    // re-introduced the demo inflation the QA fix removed.
    const resetUser = await prisma.user.upsert({
      where: { username: "Uchenik" },
      update: {
        xp: 0,
        crystals: 0,
        streak: 0,
        activeStep: 1
      },
      create: {
        username: "Uchenik",
        xp: 0,
        crystals: 0,
        streak: 0,
        activeStep: 1
      }
    });

    // Delete THIS user's saved monster so the restart is actually clean.
    // (Was a hardcoded fake id "child_user_782" — display-only string from
    // SafeProxyVisualizer — which matched no row, so the monster never cleared.)
    await prisma.monster.deleteMany({
      where: { userId: resetUser.id }
    });

    return NextResponse.json(resetUser);
  } catch (error: any) {
    console.error("Failed to reset database stats:", error);
    return NextResponse.json({ error: "Failed to reset stats" }, { status: 500 });
  }
}
