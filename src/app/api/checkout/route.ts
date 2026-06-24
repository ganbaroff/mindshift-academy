import { NextResponse } from "next/server";
import { createCheckout, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { z } from "zod";

const checkoutSchema = z.object({
  monsterWords: z.array(z.string().trim().min(1).max(32)).length(3),
  name: z.string().trim().min(1).max(64).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  color: z.string().trim().min(1).max(16).optional(),
});

function buildDemoUrl(origin: string, words: string[], name: string, emoji: string, color: string) {
  const query = new URLSearchParams({
    demo: "1",
    monster: words.join("-"),
    name,
    emoji,
    color,
  });

  return `${origin}/onboarding?${query.toString()}`;
}

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "INVALID_PAYLOAD",
          message: "Введите ровно 3 слова для запуска paywall.",
        },
        { status: 400 }
      );
    }

    const words = parsed.data.monsterWords.map((word) => word.trim());
    const name = parsed.data.name || words.join("-");
    const emoji = parsed.data.emoji || "🥚";
    const color = parsed.data.color || "#a78bfa";

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = Number(process.env.LEMONSQUEEZY_STORE_ID);
    const variantId = Number(process.env.LEMONSQUEEZY_VARIANT_ID);
    const isValidCheckout =
      Boolean(apiKey) && Number.isFinite(storeId) && storeId > 0 && Number.isFinite(variantId) && variantId > 0;

    if (!isValidCheckout) {
      return NextResponse.json({
        checkoutUrl: buildDemoUrl(origin, words, name, emoji, color),
        mode: "demo",
      });
    }

    lemonSqueezySetup({
      apiKey,
      onError: (error) => {
        console.error("Lemon Squeezy setup error:", error);
      },
    });

    const redirectQuery = new URLSearchParams({
      name,
      emoji,
      color,
      activation: "success",
    });
    const redirectUrl = `${origin}/onboarding?${redirectQuery.toString()}`;

    const checkout = await createCheckout(storeId, variantId, {
      productOptions: {
        name: "MindShift Starter",
        description: "AI Tamagotchi learning pass for families in Azerbaijan and CIS.",
        redirectUrl,
        confirmationTitle: "Monster activated",
        confirmationMessage: "Силуэт открыт. Теперь ребёнок может продолжить обучение.",
        confirmationButtonText: "Continue",
        enabledVariants: [variantId],
      },
      checkoutOptions: {
        embed: false,
        media: false,
        logo: false,
        desc: true,
        discount: false,
        skipTrial: true,
        subscriptionPreview: true,
        backgroundColor: "#11182a",
        headingsColor: "#f5f3ff",
        primaryTextColor: "#e5e7eb",
        secondaryTextColor: "#a5b4fc",
        linksColor: "#8b5cf6",
        bordersColor: "#273043",
        checkboxColor: "#8b5cf6",
        activeStateColor: "#8b5cf6",
        buttonColor: "#8b5cf6",
        buttonTextColor: "#ffffff",
      },
      checkoutData: {
        custom: {
          monsterWords: words.join(" "),
          source: "landing",
          gate: "phase-1",
        },
      },
      testMode: process.env.NODE_ENV !== "production" || process.env.LEMONSQUEEZY_TEST_MODE === "true",
    });

    const checkoutUrl = checkout.data?.data.attributes.url;

    if (!checkoutUrl) {
      return NextResponse.json(
        {
          code: "CHECKOUT_FAILED",
          message: "Не удалось подготовить checkout. Попробуйте ещё раз.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      checkoutUrl,
      mode: "live",
    });
  } catch (error) {
    console.error("Checkout route error:", error);
    return NextResponse.json(
      {
        code: "CHECKOUT_FAILED",
        message: "Checkout temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}
