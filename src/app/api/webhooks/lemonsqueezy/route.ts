import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || "";
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

    if (secret) {
      const hmac = crypto.createHmac("sha256", secret);
      const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
      const signatureBuffer = Buffer.from(signature, "utf8");

      if (
        digest.length !== signatureBuffer.length ||
        !crypto.timingSafeEqual(digest, signatureBuffer)
      ) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const data = JSON.parse(rawBody);
    const eventName = data.meta.event_name;

    if (eventName === "subscription_created" || eventName === "subscription_updated") {
      const email = data.data.attributes.user_email as string;
      const customData = data.meta.custom_data as {
        monsterWords?: string | string[];
      } | undefined;

      const user = await prisma.user.upsert({
        where: { username: email },
        update: { lastActive: new Date() },
        create: { username: email },
      });

      let words: string[] = [];
      if (typeof customData?.monsterWords === "string") {
        words = customData.monsterWords.split(" ").map(w => w.trim()).filter(Boolean);
      } else if (Array.isArray(customData?.monsterWords)) {
        words = customData.monsterWords;
      }

      if (words.length === 3) {
        const existing = await prisma.monster.findUnique({
          where: { userId: user.id },
        });

        if (!existing) {
          await prisma.monster.create({
            data: {
              userId: user.id,
              name: words.join("-"),
              emoji: "🥚",
              color: "#a78bfa",
              promptUsed: words.join(", "),
            },
          });
        }
      }

      console.log(`User subscribed: ${email}, userId: ${user.id}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
