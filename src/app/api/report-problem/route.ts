/**
 * One-tap problem report → the operator's existing alert channel.
 *
 * Design notes that matter:
 *  - The child/parent decision is taken HERE from the path, not from anything the client
 *    claims, so a child screen cannot be talked into forwarding free text.
 *  - Nothing is stored. This writes no row: a report is a message to a human, and a pilot
 *    that logs every tap has invented a new place for child data to live.
 *  - It never fails the page. A parent reporting that something is broken must not meet a
 *    second broken thing; unconfigured alert channels return ok with channel "none".
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { notifyOperator } from "@/lib/notify-operator";
import { resolveReleaseSha } from "@/lib/release-identity";
import {
  buildProblemReport,
  PROBLEM_REPORT_MAX_NOTE,
  PROBLEM_REPORT_MAX_PATH,
} from "@/lib/problem-report";

const bodySchema = z.object({
  path: z.string().min(1).max(PROBLEM_REPORT_MAX_PATH * 4),
  note: z.string().max(PROBLEM_REPORT_MAX_NOTE * 4).optional(),
});

export async function POST(req: Request) {
  try {
    let clerkId: string | null = null;
    let email: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";

    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      clerkId = (await auth()).userId;
      if (clerkId) {
        const user = await currentUser();
        email = user?.emailAddresses?.[0]?.emailAddress ?? null;
      }
    }

    if (!clerkId) {
      return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }

    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Сервис временно недоступен." }, { status: 503 });
    }
    // Deliberately generous per window and small per burst: a frustrated parent tapping
    // twice is normal, a loop is not.
    const rl = await rateLimit("report-problem", clerkId, 5, 300);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Сообщение уже отправлено. Подожди пару минут." },
        { status: 429 }
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Неверный запрос." }, { status: 400 });
    }

    const report = buildProblemReport({
      path: parsed.data.path,
      note: parsed.data.note,
      reporterEmail: email,
      releaseId: resolveReleaseSha(),
    });

    const channel = await notifyOperator(report.text, "MindShift: сообщение о проблеме");

    return NextResponse.json({
      ok: true,
      surface: report.surface,
      noteAccepted: report.note.length > 0,
      channel,
    });
  } catch (err) {
    console.error("report-problem error:", err);
    return NextResponse.json({ error: "Что-то пошло не так. Попробуй ещё раз!" }, { status: 500 });
  }
}
