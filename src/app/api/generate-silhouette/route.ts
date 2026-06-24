import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

const requestSchema = z.object({
  words: z.array(z.string().trim().min(1).max(32)).length(3),
});

// Deterministic fallback using hash
function hashWords(words: string[]) {
  let hash = 0;
  for (const word of words) {
    for (let index = 0; index < word.length; index += 1) {
      hash = (hash * 31 + word.charCodeAt(index)) % 1000;
    }
  }
  return hash;
}

const fallbackEmojis = ["🐉", "👾", "🦊", "🤖", "🦄", "🐼", "🦖", "🦁", "🐙", "🧙"];
const fallbackColors = [
  "#a78bfa", // Purple-soft
  "#4ecdc4", // Teal
  "#f59e0b", // Gold
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#ec4899", // Pink
];
const fallbackNames = ["Огняш", "Бублик", "Зефир", "Шустрик", "Кристаллик", "Луник"];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Введите ровно 3 слова." },
        { status: 400 }
      );
    }

    const words = parsed.data.words;
    const ai = (await import("@/lib/ai-provider")).getAIClient();

    if (!ai) {
      // Fallback generator — no API key configured
      const seed = hashWords(words);
      const emoji = fallbackEmojis[seed % fallbackEmojis.length];
      const color = fallbackColors[seed % fallbackColors.length];
      const name = fallbackNames[seed % fallbackNames.length];
      const description = `Этот питомец появился из слов: ${words.join(", ")}. Он ждет пробуждения.`;

      return NextResponse.json({ name, emoji, color, description });
    }

    // Call AI provider (NVIDIA or OpenAI)
    const completion = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [
        {
          role: "system",
          content: `You are a creative monster generator for an educational children's application.
Based on the child's 3 input words, generate:
1. A cute Russian name for the monster.
2. A single matching emoji.
3. A hex color matching the monster's aura (avoid plain red #FF0000, prefer softer or vibrant colors like violet, gold, teal, pink, emerald).
4. A short description of the monster in Russian (1 sentence).

Format your response as a strict JSON object with fields: "name", "emoji", "color", "description".`,
        },
        {
          role: "user",
          content: `Words: ${words.join(", ")}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to generate silhouette:", error);
    return NextResponse.json(
      { error: "Не удалось запустить силуэт." },
      { status: 500 }
    );
  }
}
