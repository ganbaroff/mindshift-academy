import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { createVerificationCode } from "@/lib/consent";
import { sendConsentCode } from "@/lib/consent-email";
import { isEmailAllowed } from "@/lib/access";

// POST /api/consent/request-code — parent requests a 6-digit verification code (spec §3 step 3).
// Body: { locale? }. The code is sent only to the signed-in Clerk account's email. Generates +
// HASH-stores a single-use, 15-min code and emails it via Resend (no-op if RESEND_API_KEY unset).
// The raw code is NEVER returned to the client and NEVER logged.
const schema = z.object({
  locale: z.enum(["ru", "az"]).optional(),
});

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const parentEmail = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? "";
    if (!parentEmail) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (!isEmailAllowed(parentEmail)) {
      return NextResponse.json(
        { error: "Для этого родительского аккаунта доступ к Academy ещё не открыт." },
        { status: 403 }
      );
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

    const locale = parsed.data.locale ?? "ru";

    const { code } = await createVerificationCode(clerkId, parentEmail);
    const { sent } = await sendConsentCode({ to: parentEmail, code, locale });

    // Report whether the email actually went out so the UI can hint when the key is missing.
    // NEVER include the code in the response.
    const body: Record<string, unknown> = { ok: true, emailSent: sent, parentEmail };
    // Local dev only: Resend sandbox often does not deliver; show code in UI so QA is not blocked.
    if (process.env.NODE_ENV === "development") {
      body.devCode = code;
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error(
      "[consent/request-code] error:",
      (error as { name?: string })?.name ?? "Error"
    );
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
