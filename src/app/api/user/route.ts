import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    // Dev-only test seam (mirrors /api/chat): the E2E harness drives the flow with
    // x-test-bypass instead of a Clerk password, so /api/user must resolve the SAME test
    // user that /api/chat writes to — otherwise progress/unlock is read from the wrong row
    // (the shared demo user) and later lessons never unlock. Inert in prod via the NODE_ENV gate.
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";
    const clerkId = isDev && testBypass ? "test_user_id" : (await auth()).userId;
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

    // SERVER-AUTHORITATIVE PROGRESSION (state-ownership cure): return the set of lesson
    // orders the child has actually completed (LessonProgress.completed=true), alongside
    // the activeStep + monster already on `user`. The lesson page rebuilds its unlock state
    // from THIS server truth on load — instead of an independent localStorage ledger — so a
    // fresh device / re-login shows real progress rather than an empty (relocked) cache.
    const completedRows = await prisma.lessonProgress.findMany({
      where: { userId: user.id, completed: true },
      select: { lesson: { select: { order: true } } },
    });
    const completedLessonIds = completedRows
      .map((r) => r.lesson?.order)
      .filter((n): n is number => typeof n === "number")
      .sort((a, b) => a - b);

    return NextResponse.json({ ...user, completedLessonIds });
  } catch (error) {
    console.error("Database user error:", error);
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
