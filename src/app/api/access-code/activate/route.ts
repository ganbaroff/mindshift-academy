import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";
import { findActivationByToken, activateAccessCode } from "@/lib/access-code";
import { findOrCreateUserByEmail } from "@/lib/clerk-backend";
import { recordConsent } from "@/lib/consent";
import { Errors } from "@/lib/errors";

// Parent activation for a one-time child-access code (spec §0 posture B, §2). Token-gated (the
// activation token from the emailed/handed link), NOT Clerk-auth — the parent has no session yet.
// GET ?t=token → which email this authorizes (so the parent sees it before consenting).
// POST { activationToken, serviceConsent, externalAiConsent } → find/create the Clerk user,
// record consent (reuses the fail-closed consent layer), and flip the code issued -> active.
const schema = z.object({
  activationToken: z.string().min(20).max(200),
  serviceConsent: z.boolean(),
  externalAiConsent: z.boolean(),
});

export async function GET(req: Request) {
  if (rateLimitMisconfiguredInProd()) {
    return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
  }
  const key = publicClientKey(req);
  if (!key) return NextResponse.json({ error: Errors.unavailable }, { status: 429 });
  const rl = await rateLimit("access-activate-status", key, 20, 60);
  if (!rl.success) {
    return NextResponse.json({ error: "Слишком много попыток. Подождите немного." }, { status: 429 });
  }

  const token = new URL(req.url).searchParams.get("t") ?? "";
  const found = await findActivationByToken(token);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ email: found.issuedForEmail, status: found.status });
}

export async function POST(req: Request) {
  try {
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
    }
    const key = publicClientKey(req);
    if (!key) return NextResponse.json({ error: Errors.unavailable }, { status: 429 });
    const rl = await rateLimit("access-activate", key, 10, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком много попыток. Подождите немного." }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: Errors.badRequest }, { status: 400 });
    const { activationToken, serviceConsent, externalAiConsent } = parsed.data;

    // Both opt-ins are mandatory (COPPA consent, spec §0). Reject before any side effect.
    if (!serviceConsent || !externalAiConsent) {
      return NextResponse.json(
        { code: "BOTH_CONSENTS_REQUIRED", error: "Нужны обе галочки." },
        { status: 400 }
      );
    }

    const found = await findActivationByToken(activationToken);
    if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Create (or find) the family's Clerk user for the allowlisted email, then attach consent.
    const clerkId = await findOrCreateUserByEmail(found.issuedForEmail);
    const consentIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;

    const res = await activateAccessCode(activationToken, {
      serviceConsent,
      externalAiConsent,
      clerkId,
      consentIp,
    });
    if (!res.ok) {
      return NextResponse.json({ error: res.reason ?? "activate_failed" }, { status: 400 });
    }

    // Reuse the existing fail-closed consent record so hasValidConsent() unlocks the child.
    await recordConsent({
      clerkId,
      parentEmail: found.issuedForEmail,
      serviceConsent,
      externalAiConsent,
      ipAddress: consentIp,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[access/activate] error:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
