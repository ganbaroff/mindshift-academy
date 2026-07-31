import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revokeConsent } from "@/lib/consent";

// POST /api/consent/revoke — parental right to revoke (spec §7). Sets revokedAt, which makes
// hasValidConsent() return false immediately, blocking chat/monster/tts on the next request.
export async function POST() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "????????? ???? ? ???????." }, { status: 401 });
    }
    const ok = await revokeConsent(clerkId);
    if (!ok) {
      return NextResponse.json({ error: "??? ???????? ??? ??????." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[consent/revoke] error:",
      (error as { name?: string })?.name ?? "Error"
    );
    return NextResponse.json({ error: "???-?? ????? ?? ???. ???????? ??? ???!" }, { status: 500 });
  }
}
