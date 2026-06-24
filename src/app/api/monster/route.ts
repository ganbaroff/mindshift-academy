import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { name, emoji, color, promptUsed, skipImage } = await req.json();

    if (!name || !emoji || !color || !promptUsed) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let imageUrl = "";

    // 1. Generate image (gpt-image-2 via OpenAI API, or beautiful inline SVG fallback)
    // Cost estimate: gpt-image-2 at 1024x1024 ≈ 0.008–0.02 USD per image (token-based pricing)
    if (skipImage || !apiKey || apiKey === "YOUR_API_KEY_HERE") {
      // Return a beautiful glowing SVG matching the monster's color and emoji
      imageUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="grad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${encodeURIComponent(color)}" stop-opacity="0.4"/><stop offset="100%" stop-color="%23090d16" stop-opacity="1"/></radialGradient></defs><rect width="400" height="400" fill="%23090d16"/><circle cx="200" cy="180" r="120" fill="url(%23grad)"/><text x="200" y="210" font-size="100" text-anchor="middle">${encodeURIComponent(emoji)}</text><text x="200" y="310" font-family="sans-serif" font-weight="bold" font-size="22" fill="white" text-anchor="middle">${encodeURIComponent(name)}</text><text x="200" y="345" font-family="sans-serif" font-size="12" fill="%239ca3af" text-anchor="middle">MindShift Academy AI Partner</text></svg>`;
    } else {
      const openai = new OpenAI({ apiKey });
      const imagePrompt = `A cute 3D cartoon style mascot creature, friendly little monster, representing: ${name}. Character style is closely matching emoji: ${emoji}. Colorful glowing magic aura of ${color}, highly detailed, Pixar style rendering, 3D render, white smooth background, 8k resolution.`;

      const imageResponse = await openai.images.generate({
        model: "gpt-image-2",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });

      const imageBase64 = imageResponse.data?.[0]?.b64_json || "";
      imageUrl = imageBase64 ? `data:image/png;base64,${imageBase64}` : "";
    }

    // 2. Fetch or create User
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    let user;
    if (clerkId) {
      user = await prisma.user.findUnique({
        where: { clerkId },
      });
    }

    if (!user) {
      user = await prisma.user.findUnique({
        where: { username: "Uchenik" },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            username: "Uchenik",
            xp: 450,
            crystals: 120,
            streak: 3,
            activeStep: 2,
          },
        });
      }
    }

    // 3. Save/Update monster to the SQLite DB using upsert
    const savedMonster = await prisma.monster.upsert({
      where: { userId: user.id },
      update: {
        name,
        emoji,
        color,
        promptUsed: `[redacted-${promptUsed.length}ch]`, // COPPA: don't store raw child input
        imageUrl,
      },
      create: {
        userId: user.id,
        name,
        emoji,
        color,
        promptUsed: `[redacted-${promptUsed.length}ch]`, // COPPA: don't store raw child input
        imageUrl,
      },
    });

    return NextResponse.json(savedMonster);
  } catch (error: unknown) {
    console.error("Failed to generate monster:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
