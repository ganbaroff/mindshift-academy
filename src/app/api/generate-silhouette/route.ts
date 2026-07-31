import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";
// The deterministic, no-egress preview logic lives in @/lib/silhouette so it can be asserted
// offline AND so this route stays provably free of any external-AI / moderation import.
import { deterministicSilhouette } from "@/lib/silhouette";
import { Errors } from "@/lib/errors";

const requestSchema = z.object({
  words: z.array(z.string().trim().min(1).max(32)).length(3),
});

export async function POST(req: Request) {
  try {
    // Keep the cheap public-funnel rate limit (abuse cap). It runs first so a 429 is cheap.
    // Fail-closed in prod if the limiter is misconfigured (documented in DEPLOY-CHECKLIST).
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
    }
    const clientKey = publicClientKey(req);
    if (!clientKey) {
      return NextResponse.json({ error: "Не удалось проверить источник запроса." }, { status: 429 });
    }
    const rl = await rateLimit("silhouette", clientKey, 6, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком много запросов, попробуй чуть позже." }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Введите ровно 3 слова." }, { status: 400 });
    }

    // Pure-local, deterministic response. No auth, no consent, no external egress.
    return NextResponse.json(deterministicSilhouette(parsed.data.words));
  } catch (error) {
    console.error("[silhouette] generation failed:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ error: "Не удалось запустить силуэт." }, { status: 500 });
  }
}
