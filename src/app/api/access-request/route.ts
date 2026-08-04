import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";
import { parseAccessRequest, operatorAlertText, maskEmail } from "@/lib/access-requests";
import { notifyOperator } from "@/lib/notify-operator";
import { Errors } from "@/lib/errors";

/**
 * Public "ask for pilot access" inbox (adults only — see src/lib/access-requests.ts).
 *
 * Storing a row grants NOTHING: access still requires an operator to add the allowlist grant
 * and hand out a one-time code. The endpoint is public because a parent has no account yet,
 * so it is rate-limited and fails closed when the distributed limiter is missing in production.
 *
 * The answer is deliberately uniform (200 for a fresh request, a repeat, and a honeypot hit):
 * an outsider must not be able to probe which addresses already asked.
 */
export async function POST(req: Request) {
  try {
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ ok: false, error: Errors.unavailable }, { status: 503 });
    }
    const key = publicClientKey(req);
    if (!key) return NextResponse.json({ ok: false, error: Errors.unavailable }, { status: 429 });
    const rl = await rateLimit("access-request", key, 5, 3600);
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: "Слишком много заявок. Попробуйте позже." },
        { status: 429 }
      );
    }

    const parsed = parseAccessRequest(await req.json().catch(() => ({})));
    if (!parsed.ok) {
      // A bot that filled the honeypot gets the same calm 200 as a real parent.
      if (parsed.reason === "bot") return NextResponse.json({ ok: true });
      return NextResponse.json(
        { ok: false, error: "Проверьте адрес почты и попробуйте ещё раз." },
        { status: 400 }
      );
    }

    const { email, parentName, note } = parsed.value;
    const existing = await prisma.accessRequest.findUnique({ where: { email } });
    if (existing) {
      // Repeat submission: keep the first record and the operator's decision, stay quiet.
      return NextResponse.json({ ok: true });
    }

    const created = await prisma.accessRequest.create({
      data: { email, parentName, note, source: "site", status: "new" },
    });

    // The alert runs AFTER the response. Awaiting a multi-second Telegram round-trip here made
    // a new address measurably slower than a repeat one, which handed an outsider the very
    // "has this parent asked?" oracle the uniform {ok:true} body is meant to deny.
    after(async () => {
      const channel = await notifyOperator(
        operatorAlertText({ email, parentName, note }, process.env.NEXT_PUBLIC_APP_URL)
      );
      if (channel !== "none") {
        await prisma.accessRequest.update({
          where: { id: created.id },
          data: { notifiedAt: new Date() },
        });
      } else {
        // Masked on purpose: the operator inbox is the DB, the log is only a breadcrumb.
        console.warn("[access-request] stored without operator alert:", maskEmail(email));
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[access-request] error:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ ok: false, error: Errors.calmRetry }, { status: 500 });
  }
}
