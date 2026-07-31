import { NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { hasValidConsent } from "@/lib/consent";
import { Errors } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    // P0-4: require auth — closes the unauthenticated paid-TTS proxy on arbitrary text.
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
    }

    // COPPA CONSENT GATE (spec §5): TTS voices the child's / tutor's text; gate it on valid
    // parental consent before any (external) synthesis. Fail-closed.
    if (!(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Нужно согласие родителя." },
        { status: 403 }
      );
    }
    // P0-4: in prod with no distributed limiter, refuse rather than run a paid TTS unthrottled.
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: Errors.unavailable }, { status: 503 });
    }
    const rl = await rateLimit("tts", clerkId, 15, 60);
    if (!rl.success) {
      return NextResponse.json({ error: Errors.rateLimited }, { status: 429 });
    }

    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: Errors.badRequest }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      // OpenAI TTS (paid, high quality)
      const openai = new OpenAI({ apiKey, timeout: 8000, maxRetries: 0 });
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text.slice(0, 500),
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return new Response(buffer, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=172800",
        },
      });
    }

    // No OpenAI key — return 503 with hint to use client-side Web Speech API
    return NextResponse.json({
      error: "server_tts_unavailable",
      hint: "Use browser SpeechSynthesis API as fallback",
      text: text.slice(0, 500),
    }, { status: 503 });
  } catch (error: unknown) {
    console.error("[tts] generation failed:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
