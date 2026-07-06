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
        // 2. Check email alignment (legacy: LemonSqueezy created user by email as username)
        const clerkUser = await currentUser();
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress;

        if (email) {
          user = await prisma.user.findUnique({
            where: { username: email },
            include: { monster: true },
          });

          if (user) {
            // Link this Clerk user to the existing account
            user = await prisma.user.update({
              where: { id: user.id },
              data: { clerkId },
              include: { monster: true },
            });
          }
        }

        if (!user) {
          // 3. First visit for this Clerk account — create their own row.
          // IDEMPOTENT (P1-I): upsert on unique clerkId so two concurrent first-visits
          // for the same account can't P2002-race the create.
          user = await prisma.user.upsert({
            where: { clerkId },
            update: {},
            create: {
              clerkId,
              username: clerkId, // #1: unique per user (was hardcoded "Uchenik" → P2002 on 2nd child)
              xp: 0,
              crystals: 0,
              streak: 0,
              activeStep: 1,
            },
            include: { monster: true },
          });
        }
      }
    }

    // 4. Fallback to shared demo user for anonymous sessions.
    // IDEMPOTENT (P1-I): upsert on the unique username so two concurrent anon reads
    // can't P2002-race the "Uchenik" create. (This GET is read-mostly and unauthenticated
    // callers still need a row to render; the write path that actually mutates child
    // progress — /api/chat — is now auth-gated with no anon row, per P0-B.)
    if (!user) {
      user = await prisma.user.upsert({
        where: { username: "Uchenik" },
        update: {},
        create: {
          username: "Uchenik",
          xp: 0,
          crystals: 0,
          streak: 0,
          activeStep: 1,
        },
        include: { monster: true },
      });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Database user error:", error);
    return NextResponse.json({ error: "Failed to fetch or create user" }, { status: 500 });
  }
}
