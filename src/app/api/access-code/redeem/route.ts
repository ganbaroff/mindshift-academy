import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";
import { redeemAccessCode } from "@/lib/access-code";
import { mintSignInTicket } from "@/lib/clerk-backend";

// Child redemption of a one-time access code (spec §2). Public + rate-limited: the code IS the
// credential. On a valid, parent-activated, unexpired code we mint a single-use Clerk sign-in
// ticket and return it in the JSON body ONLY (never a URL, never logged) — the child's browser
// consumes it via useSignIn().create({ strategy: "ticket" }).
const schema = z.object({ code: z.string().min(1).max(40) });

export async function POST(req: Request) {
  try {
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ ok: false, error: "Service temporarily unavailable" }, { status: 503 });
    }
    const key = publicClientKey(req);
    if (!key) return NextResponse.json({ ok: false, error: "Rate limit unavailable" }, { status: 429 });
    // Tight limit: brute-forcing an 8-char / 30-symbol space is infeasible at 8/min.
    const rl = await rateLimit("access-redeem", key, 8, 60);
    if (!rl.success) {
      return NextResponse.json({ ok: false, error: "Слишком много попыток. Подожди минутку." }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

    const res = await redeemAccessCode(parsed.data.code);
    if (!res.ok || !res.clerkId) {
      // Uniform soft failure — never reveal whether a code exists / was already used vs just wrong.
      return NextResponse.json({ ok: false, error: "Код не подошёл. Проверь и попробуй ещё раз." }, { status: 400 });
    }

    const ticket = await mintSignInTicket(res.clerkId);
    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    console.error("[access/redeem] error:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
