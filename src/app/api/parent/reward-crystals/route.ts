import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    let user;

    if (clerkId) {
      user = await prisma.user.findUnique({
        where: { clerkId },
      });
    }

    if (!user) {
      // Fallback for preview mode
      user = await prisma.user.findUnique({
        where: { username: "Uchenik" },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            username: "Uchenik",
            xp: 450,
            crystals: 120,
            streak: 3,
            activeStep: 1,
          },
        });
      }
    }

    // Increment user crystals by 100 for positive reinforcement
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        crystals: { increment: 100 },
      },
    });

    return NextResponse.json({ success: true, crystals: updated.crystals });
  } catch (error: any) {
    console.error("Failed to reward crystals:", error);
    return NextResponse.json({ error: "Failed to process crystal purchase" }, { status: 500 });
  }
}
