import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { restartChildData } from "@/lib/child-data";

// "Start over" for the CURRENT signed-in child: resets THEIR OWN progress to a fresh state
// (0/0/0, lesson 1) and clears Academy gameplay state. Requires auth and only ever touches
// the caller's own row (keyed by clerkId), so it is safe in every environment. It is NOT a
// privacy erase path: consent is deliberately retained; DELETE /api/child-data is permanent.
//
// Previously this was dev-only (403 in prod, which disabled the graduation "start over"
// button) AND, when reachable, reset a hardcoded SHARED demo row ("Uchenik") with NO auth —
// so an unauthenticated caller could wipe a shared dev/staging user. Both problems are gone:
// auth is required and every write is scoped to the caller.
export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "????????? ???? ? ???????." }, { status: 401 });
  }

  try {
    await restartChildData(clerkId);

    return NextResponse.json({ ok: true, xp: 0, crystals: 0, streak: 0, activeStep: 1 });
  } catch (error) {
    console.error("[reset] failed:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ error: "???-?? ????? ?? ???. ???????? ??? ???!" }, { status: 500 });
  }
}
