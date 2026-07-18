import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rollGacha } from "@/lib/retention-engine";

export async function POST() {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();

    // P0-4: require authentication (closes the anonymous claim exploit).
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // P0-4: server-side daily guard — one claim per calendar day. Stops the no-guard spam
    // exploit (client-side hasClaimedToday was the ONLY check). A user who already claimed
    // today (streak > 0 AND lastActive is today) is rejected here, not trusted to self-limit.
    const now = new Date();
    const last = user.lastActive ? new Date(user.lastActive) : null;
    const alreadyClaimedToday = user.streak > 0 && last && last.toDateString() === now.toDateString();
    if (alreadyClaimedToday) {
      return NextResponse.json({ error: "Награда уже получена сегодня" }, { status: 409 });
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
  } catch (error) {
    console.error("Gacha claim error:", error);
    return NextResponse.json({ error: "Failed to claim daily reward" }, { status: 500 });
  }
}
