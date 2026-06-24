import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rollGacha } from "@/lib/retention-engine";

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

    // Determine current day in the 7-day reward cycle
    const nextStreak = (user.streak % 7) + 1;
    const reward = rollGacha(nextStreak);

    // Update user streak and apply rewards
    if (reward.type === "crystals") {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          crystals: { increment: reward.amount },
          streak: nextStreak,
          lastActive: new Date(),
        },
      });
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            streak: nextStreak,
            lastActive: new Date(),
          },
        }),
        prisma.inventory.upsert({
          where: {
            userId_itemId: {
              userId: user.id,
              itemId: reward.itemId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            itemType: reward.type,
            itemId: reward.itemId,
          },
        }),
      ]);
    }

    return NextResponse.json({ success: true, reward, nextStreak });
  } catch (error: any) {
    console.error("Gacha claim error:", error);
    return NextResponse.json({ error: "Failed to claim daily reward" }, { status: 500 });
  }
}
