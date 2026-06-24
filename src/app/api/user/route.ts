import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    let user = null;

    if (clerkId) {
      // 1. Try to find user by clerkId
      user = await prisma.user.findUnique({
        where: { clerkId },
        include: { monster: true },
      });

      if (!user) {
        // 2. If not found, check email alignment (LemonSqueezy creates user by email as username)
        const clerkUser = await currentUser();
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

        if (email) {
          user = await prisma.user.findUnique({
            where: { username: email },
            include: { monster: true },
          });

          if (user) {
            // Link this Clerk user to the paid account
            user = await prisma.user.update({
              where: { id: user.id },
              data: { clerkId },
              include: { monster: true },
            });
          }
        }
      }
    }

    // 3. Fallback to "Uchenik" if not logged in or account not found
    if (!user) {
      user = await prisma.user.findUnique({
        where: { username: "Uchenik" },
        include: { monster: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: "Uchenik",
            xp: 450,
            crystals: 120,
            streak: 3,
            activeStep: 2,
          },
          include: { monster: true },
        });
      }
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Database user error:", error);
    return NextResponse.json({ error: "Failed to fetch or create user" }, { status: 500 });
  }
}
