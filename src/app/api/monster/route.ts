import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { hasValidConsent } from "@/lib/consent";

export async function POST(req: Request) {
  try {
    // P0-4: require authentication FIRST — before any (potentially paid) image generation.
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // COPPA CONSENT GATE (spec §5): the monster stores the child's pet name/look and its
    // prompt is child-authored — no child-data work without valid parental consent. Fail-closed.
    if (!(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Нужно согласие родителя." },
        { status: 403 }
      );
    }

    // P0-4: per-user rate limit + prod fail-closed — this can run a PAID gpt-image generation,
    // so a shared invite or "regenerate" spam must not burn it unthrottled.
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    const rl = await rateLimit("monster", clerkId, 10, 60);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком часто. Подожди немного." }, { status: 429 });
    }

    const { name, emoji, color, promptUsed, skipImage } = await req.json();

    if (!name || !emoji || !color || !promptUsed) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // NV2: constrain child-supplied strings so they can't restructure the image prompt
    // (no newlines/quotes, bounded length, hex-validated colour).
    const safeName = String(name).replace(/[\r\n"]/g, " ").slice(0, 40);
    const safeEmoji = String(emoji).replace(/[\r\n"\s]/g, "").slice(0, 8);
    const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(String(color)) ? String(color) : "#8b5cf6";

    const apiKey = process.env.OPENAI_API_KEY;
    let imageUrl = "";

    // 1. Generate image (gpt-image-2 via OpenAI API, or beautiful inline SVG fallback)
    // Cost estimate: gpt-image-2 at 1024x1024 ≈ 0.008–0.02 USD per image (token-based pricing)
    if (skipImage || !apiKey || apiKey === "YOUR_API_KEY_HERE") {
      // Return a beautiful glowing SVG matching the monster's color and emoji
      imageUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="grad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${encodeURIComponent(color)}" stop-opacity="0.4"/><stop offset="100%" stop-color="%23090d16" stop-opacity="1"/></radialGradient></defs><rect width="400" height="400" fill="%23090d16"/><circle cx="200" cy="180" r="120" fill="url(%23grad)"/><text x="200" y="210" font-size="100" text-anchor="middle">${encodeURIComponent(emoji)}</text><text x="200" y="310" font-family="sans-serif" font-weight="bold" font-size="22" fill="white" text-anchor="middle">${encodeURIComponent(name)}</text><text x="200" y="345" font-family="sans-serif" font-size="12" fill="%239ca3af" text-anchor="middle">MindShift Academy AI Partner</text></svg>`;
    } else {
      const openai = new OpenAI({ apiKey });
      const imagePrompt = `A cute 3D cartoon style mascot creature, friendly little monster, representing: ${safeName}. Character style is closely matching emoji: ${safeEmoji}. Colorful glowing magic aura of ${safeColor}, highly detailed, Pixar style rendering, 3D render, white smooth background, 8k resolution.`;

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

    // 2. Fetch or create THIS user's row (auth already required above; no anonymous fallback).
    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: { clerkId, username: clerkId, xp: 0, crystals: 0, streak: 0, activeStep: 1 }, // #1: unique per user (monster name lives on Monster.name)
      });
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
    console.error("[monster] generation failed:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
