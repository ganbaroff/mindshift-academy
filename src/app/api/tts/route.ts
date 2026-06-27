import { NextResponse } from "next/server";
import OpenAI from "openai";

// Best-effort in-memory per-user rate limit (single-instance; prod should use Upstash/Redis).
const ttsHits = new Map<string, number[]>();
const TTS_LIMIT = 15;
const TTS_WINDOW_MS = 60_000;
function ttsRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (ttsHits.get(key) || []).filter((t) => now - t < TTS_WINDOW_MS);
  recent.push(now);
  ttsHits.set(key, recent);
  return recent.length > TTS_LIMIT;
}

export async function POST(req: Request) {
  try {
    // P0-4: require auth — closes the unauthenticated paid-TTS proxy on arbitrary text.
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ttsRateLimited(clerkId)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait." }, { status: 429 });
    }

    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Text field is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== "YOUR_API_KEY_HERE") {
      // OpenAI TTS (paid, high quality)
      const openai = new OpenAI({ apiKey });
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
    console.error("TTS generation failed:", error);
    return NextResponse.json({ error: "Failed to generate voice output" }, { status: 500 });
  }
}
