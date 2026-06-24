import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
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
