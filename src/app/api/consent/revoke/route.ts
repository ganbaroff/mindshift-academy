import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revokeConsent } from "@/lib/consent";
import { Errors } from "@/lib/errors";

// POST /api/consent/revoke — parental right to revoke (spec §7). Sets revokedAt, which makes
// hasValidConsent() return false immediately, blocking chat/monster/tts on the next request.
export async function POST() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
    }
    const ok = await revokeConsent(clerkId);
    if (!ok) {
      return NextResponse.json({ error: Errors.noConsentToRevoke }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[consent/revoke] error:",
      (error as { name?: string })?.name ?? "Error"
    );
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
