import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import OpenAI from "openai";
import { moderate } from "@/lib/moderation";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";

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

// Deterministic, no-LLM preview. This is what the PUBLIC landing gets — no child words
// egress to the live model before sign-up (COPPA/consent is CEO-gated; until wired, the
// public funnel must not send free-text to NVIDIA/OpenAI).
function deterministicSilhouette(words: string[]) {
  const seed = hashWords(words);
  const emoji = fallbackEmojis[seed % fallbackEmojis.length];
  const color = fallbackColors[seed % fallbackColors.length];
  const name = fallbackNames[seed % fallbackNames.length];
  const description = `Этот питомец появился из слов: ${words.join(", ")}. Он ждет пробуждения.`;
  return { name, emoji, color, description };
}

export async function POST(req: Request) {
  try {
    // P0-4: IP-based rate limit on this PUBLIC LLM/image endpoint — keep it public, cap abuse.
    // Runs BEFORE moderation/LLM so a 429 is cheap.
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    // Trusted per-caller key (Vercel ipAddress). No trusted IP in prod → refuse, rather than
    // bucket every anonymous caller into one shared key (which would self-DoS the public funnel).
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
      return NextResponse.json(
        { error: "Введите ровно 3 слова." },
        { status: 400 }
      );
    }

    const words = parsed.data.words;

    // P0-C: the PUBLIC landing preview must NOT egress child free-text to the live model
    // before sign-up/consent (consent is CEO-gated). Unauthenticated callers get the
    // deterministic no-LLM fallback. Only a signed-in caller reaches the live model path.
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(deterministicSilhouette(words));
    }

    const ai = (await import("@/lib/ai-provider")).getAIClient();

    if (!ai) {
      // Fallback generator — no API key configured
      return NextResponse.json(deterministicSilhouette(words));
    }

    // P0-2 SAFETY: moderate the child's 3 words before sending them to the model.
    const mod = await moderate(ai.client, ai.model, words.join(" "));
    if (!mod.safe) {
      return NextResponse.json(
        { error: "Давай придумаем добрые слова для монстра 😊" },
        { status: 400 }
      );
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

    // NV4: moderate the model's free-text OUTPUT (description) before returning it to the child.
    const outMod = await moderate(ai.client, ai.model, String(data?.description ?? ""));
    if (!outMod.safe) {
      data.description = "Твой питомец почти готов — продолжим в игре!";
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[silhouette] generation failed:", (error as any)?.name ?? "Error");
    return NextResponse.json(
      { error: "Не удалось запустить силуэт." },
      { status: 500 }
    );
  }
}
