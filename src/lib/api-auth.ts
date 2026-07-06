import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function getAuthenticatedUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // P1-E: key strictly by clerkId. The old code adopted an anonymous row
  // (findFirst({ clerkId: null }) → write current clerkId onto it) — an
  // account-hijack path: the first signed-in child silently claimed the shared
  // "Uchenik" row (and its xp/progress). Never adopt; upsert a fresh row instead.
  // username is @unique, so seed it with clerkId (matches chat/user routes) to
  // avoid colliding on the "Uchenik" default. Upsert keeps this idempotent under
  // concurrent first-visits (no P2002 race on the clerkId @unique key).
  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {},
    create: { clerkId, username: clerkId },
  });

  return { user, error: null };
}
