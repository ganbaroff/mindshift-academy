import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();

    // P0-4: require authentication. Closes the demonstrated unauthenticated currency-mint
    // (anonymous curl granted +100 to a shared "Uchenik" row). RESIDUAL (not yet closed):
    // there is no parent role, so an authenticated child could still call this directly —
    // a full fix needs a parent-authorization gate. This change closes the anonymous vector.
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
