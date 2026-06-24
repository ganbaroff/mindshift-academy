import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function getAuthenticatedUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  let user = await prisma.user.findFirst({ where: { clerkId } });

  if (!user) {
    // Try to find by default user and link clerkId
    user = await prisma.user.findFirst({ where: { clerkId: null } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { clerkId },
      });
    }
  }

  if (!user) {
    return { user: null, error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user, error: null };
}
