/**
 * POST /api/formulation/submit — stores submitted-state metadata ONLY.
 * Body may include utterance for in-session UI echo, but it is NEVER persisted.
 */

import { NextResponse } from "next/server";
import { hasValidConsent } from "@/lib/consent";
import { prisma } from "@/lib/prisma";
import {
  formulationSubmittedMeta,
  FORMULATION_CONTENT_VERSION,
} from "@/lib/certificate";
import { CAPSTONE_SESSION_ID } from "@/lib/evolution";
import { moderate } from "@/lib/moderation";
import { getGuardClient, getSafetyClient } from "@/lib/ai-provider";
import { Errors } from "@/lib/errors";
import {
  getFakeAiMode,
  ITOG_DEFERRED_MESSAGE,
} from "@/lib/fake-ai";
import { recordDegradeEvent } from "@/lib/degrade-events";

export async function POST(req: Request) {
  try {
    let clerkId: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";
    if (testBypass && !isDev) {
      return NextResponse.json({ error: Errors.bypassUnavailable }, { status: 403 });
    }
    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
      try {
        const { auth } = await import("@clerk/nextjs/server");
        clerkId = (await auth()).userId;
      } catch {
        return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
      }
    }
    if (!clerkId) {
      return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }
    if (!(isDev && testBypass) && !(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Нужно согласие родителя." },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      utterance?: string;
      sessionId?: string;
    };
    const sessionId = body.sessionId ?? CAPSTONE_SESSION_ID;
    if (sessionId !== CAPSTONE_SESSION_ID) {
      return NextResponse.json({ error: "Формулировка только на капстоуне." }, { status: 400 });
    }

    const utterance = typeof body.utterance === "string" ? body.utterance.trim() : "";
    if (utterance.length < 3) {
      return NextResponse.json({ error: "Напиши правило своими словами." }, { status: 400 });
    }

    // Safety check on utterance — still never store it.
    if (!(isDev && testBypass)) {
      const safety = getSafetyClient();
      if (!safety) {
        return NextResponse.json({ error: "Сервис временно недоступен." }, { status: 503 });
      }
      const mod = await moderate(
        getGuardClient(),
        safety.client,
        safety.model,
        utterance
      );
      if (!mod.safe) {
        minimizeChildText(utterance);
        return NextResponse.json(
          { error: "Давай сформулируем иначе.", code: "SAFETY" },
          { status: 422 }
        );
      }
    }

    const dbUser = await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        username: clerkId,
        xp: 0,
        crystals: 0,
        streak: 0,
        activeStep: 1,
      },
    });

    const meta = formulationSubmittedMeta(FORMULATION_CONTENT_VERSION);
    await prisma.formulationSubmission.upsert({
      where: {
        userId_sessionId: { userId: dbUser.id, sessionId },
      },
      update: {
        contentVersion: meta.contentVersion,
        dayBucket: meta.dayBucket,
        complete: true,
      },
      create: {
        userId: dbUser.id,
        sessionId,
        contentVersion: meta.contentVersion,
        dayBucket: meta.dayBucket,
        complete: true,
      },
    });

    const fakeMode = getFakeAiMode();
    if (fakeMode === "judge_down") {
      await recordDegradeEvent({
        lessonId: sessionId,
        providerStage: "judge",
        causeEnum: "provider_down",
        resolvedByFallback: true,
      });
      return NextResponse.json({
        ok: true,
        submitted: true,
        contentVersion: meta.contentVersion,
        dayBucket: meta.dayBucket,
        complete: true,
        itogDeferred: true,
        message: ITOG_DEFERRED_MESSAGE,
        echo: utterance,
      });
    }

    // Echo utterance only in this response for current-session UI — not persisted.
    return NextResponse.json({
      ok: true,
      submitted: true,
      contentVersion: meta.contentVersion,
      dayBucket: meta.dayBucket,
      complete: true,
      echo: utterance,
    });
  } catch (err) {
    console.error("formulation submit error:", err);
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
