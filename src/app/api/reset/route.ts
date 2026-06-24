import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Reset default user stats in SQLite database
    const resetUser = await prisma.user.upsert({
      where: { username: "Uchenik" },
      update: {
        xp: 450,
        crystals: 120,
        activeStep: 2
      },
      create: {
        username: "Uchenik",
        xp: 450,
        crystals: 120,
        activeStep: 2,
        streak: 3
      }
    });

    // Delete saved monsters for this user to allow restarting the lesson clean
    await prisma.monster.deleteMany({
      where: { userId: "child_user_782" }
    });

    return NextResponse.json(resetUser);
  } catch (error: any) {
    console.error("Failed to reset database stats:", error);
    return NextResponse.json({ error: "Failed to reset stats" }, { status: 500 });
  }
}
