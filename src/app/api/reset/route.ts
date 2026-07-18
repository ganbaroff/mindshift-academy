import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// "Start over" for the CURRENT signed-in child: resets THEIR OWN progress to a fresh state
// (0/0/0, lesson 1) and clears THEIR monster + per-lesson progress. Requires auth and only
// ever touches the caller's own row (keyed by clerkId), so it is safe in every environment
// and doubles as the COPPA self-service "erase my child's data" path.
//
// Previously this was dev-only (403 in prod, which disabled the graduation "start over"
// button) AND, when reachable, reset a hardcoded SHARED demo row ("Uchenik") with NO auth —
// so an unauthenticated caller could wipe a shared dev/staging user. Both problems are gone:
// auth is required and every write is scoped to the caller.
export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: { xp: 0, crystals: 0, streak: 0, activeStep: 1 },
      create: { clerkId, username: clerkId, xp: 0, crystals: 0, streak: 0, activeStep: 1 },
    });

    // Clear this user's saved monster + lesson progress so the restart is genuinely "from the
    // very beginning". Both cascade off userId; deleteMany is idempotent (safe to replay).
    await prisma.monster.deleteMany({ where: { userId: user.id } });
    await prisma.lessonProgress.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({ ok: true, xp: 0, crystals: 0, streak: 0, activeStep: 1 });
  } catch (error) {
    console.error("[reset] failed:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ error: "Failed to reset stats" }, { status: 500 });
  }
}
