import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { verifyCode, recordConsent } from "@/lib/consent";

// POST /api/consent/verify — confirm the emailed code + record consent (spec §3 steps 4-5).
// Body: { code, serviceConsent, externalAiConsent }. BOTH opt-ins are required (§4). On success
// writes ParentalConsent(verifiedAt=now) and the child gates unlock.
const schema = z.object({
  code: z.string().regex(/^\d{6}$/),
  serviceConsent: z.boolean(),
  externalAiConsent: z.boolean(),
});

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    const rl = await rateLimit("consent-verify", clerkId, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Слишком много попыток. Подожди немного." },
        { status: 429 }
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { code, serviceConsent, externalAiConsent } = parsed.data;

    // Both consents are mandatory (spec §4). Reject before consuming the code so the parent
    // can re-submit with both boxes checked using the same still-valid code.
    if (!serviceConsent || !externalAiConsent) {
      return NextResponse.json(
        { code: "BOTH_CONSENTS_REQUIRED", error: "Нужны обе галочки." },
        { status: 400 }
      );
    }

    const result = await verifyCode(clerkId, code);
    if (!result.ok || !result.parentEmail) {
      return NextResponse.json(
        { code: "CODE_INVALID", error: "Код неверный или устарел.", reason: result.reason },
        { status: 400 }
      );
    }

    // Best-effort IP capture for the consent record (spec §4 ipAddress?).
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    await recordConsent({
      clerkId,
      parentEmail: result.parentEmail,
      serviceConsent,
      externalAiConsent,
      ipAddress,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[consent/verify] error:",
      (error as { name?: string })?.name ?? "Error"
    );
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
