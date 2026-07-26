/**
 * Read released session content (no child data egress). Auth + consent required.
 */

import { NextResponse } from "next/server";
import { hasValidConsent } from "@/lib/consent";
import { getSession } from "@/content/curriculum";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    let clerkId: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";

    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
      const { auth } = await import("@clerk/nextjs/server");
      clerkId = (await auth()).userId;
    }

    if (!clerkId) {
      return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }
    if (!(isDev && testBypass) && !(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Parental consent required." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const session = getSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (err) {
    console.error("tasks/session error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
