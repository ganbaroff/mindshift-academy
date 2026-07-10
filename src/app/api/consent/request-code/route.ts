import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { createVerificationCode } from "@/lib/consent";
import { sendConsentCode } from "@/lib/consent-email";

// POST /api/consent/request-code — parent requests a 6-digit verification code (spec §3 step 3).
// Body: { email?, locale? }. Defaults email to the Clerk account email. Generates + HASH-stores
// a single-use, 15-min code and emails it via Resend (no-op if RESEND_API_KEY unset). The raw
// code is NEVER returned to the client and NEVER logged.
const schema = z.object({
  email: z.string().email().max(200).optional(),
  locale: z.enum(["ru", "az"]).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Throttle: a code request sends a real email — cap it per account. Fail-closed in prod
    // without a distributed limiter (consistent with the other write endpoints).
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    const rl = await rateLimit("consent-code", clerkId, 5, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Слишком часто. Подожди немного." },
        { status: 429 }
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Default to the Clerk account email; allow the parent to override with their own.
    const user = await currentUser();
    const clerkEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
    const parentEmail = (parsed.data.email ?? clerkEmail ?? "").trim().toLowerCase();
    if (!parentEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    const locale = parsed.data.locale ?? "ru";

    const { code } = await createVerificationCode(clerkId, parentEmail);
    const { sent } = await sendConsentCode({ to: parentEmail, code, locale });

    // Report whether the email actually went out so the UI can hint when the key is missing.
    // NEVER include the code in the response.
    return NextResponse.json({ ok: true, emailSent: sent, parentEmail });
  } catch (error) {
    console.error(
      "[consent/request-code] error:",
      (error as { name?: string })?.name ?? "Error"
    );
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
