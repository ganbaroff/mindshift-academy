/**
 * GET /api/certificate — eligibility + issued cert (protected).
 * POST /api/certificate — issue when eligible; optional displayLabel (3A.3).
 * Never logs display labels or child formulation text.
 */

import { NextResponse } from "next/server";
import { hasValidConsent } from "@/lib/consent";
import { prisma } from "@/lib/prisma";
import {
  evaluateCertificateEligibility,
  mintCertificateId,
  dayBucket,
  FORMULATION_CONTENT_VERSION,
  ALL_SESSION_IDS,
} from "@/lib/certificate";
import {
  filterCertificateDisplayLabel,
  resolveCertificateLabel,
  DEFAULT_CERTIFICATE_LABEL,
} from "@/lib/certificate-label";
import { isCurriculumSessionComplete } from "@/lib/tasks/crystals";
import { CAPSTONE_SESSION_ID } from "@/lib/evolution";

async function resolveClerkId(req: Request): Promise<string | null> {
  const isDev = process.env.NODE_ENV === "development";
  const testBypass = req.headers.get("x-test-bypass") === "true";
  if (testBypass && !isDev) return null;
  if (isDev && testBypass) return "test_user_id";
  try {
    const { auth } = await import("@clerk/nextjs/server");
    return (await auth()).userId;
  } catch {
    return null;
  }
}

async function completedSessionsFor(userId: string): Promise<string[]> {
  const out: string[] = [];
  for (const id of ALL_SESSION_IDS) {
    if (await isCurriculumSessionComplete(userId, id)) out.push(id);
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const clerkId = await resolveClerkId(req);
    if (!clerkId) {
      return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";
    if (!(isDev && testBypass) && !(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Нужно согласие родителя." },
        { status: 403 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        conceptMasteries: true,
        formulationSubmissions: { where: { sessionId: CAPSTONE_SESSION_ID } },
        certificate: true,
        monster: true,
      },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    const completed = await completedSessionsFor(dbUser.id);
    const masteryByConcept: Record<string, number> = {};
    for (const row of dbUser.conceptMasteries) {
      masteryByConcept[row.concept] = row.mastery;
    }
    const formulationSubmitted = dbUser.formulationSubmissions.some((f) => f.complete);
    const eligibility = evaluateCertificateEligibility({
      completedSessionIds: completed,
      masteryByConcept,
      formulationSubmitted,
    });

    const cert = dbUser.certificate ?? null;

    return NextResponse.json({
      eligibility,
      certificate: cert
        ? {
            id: cert.id,
            recipientLabel: cert.recipientLabel,
            issuedDayBucket: cert.issuedDayBucket,
          }
        : null,
      defaultLabel: DEFAULT_CERTIFICATE_LABEL,
      hasDisplayLabel: Boolean(dbUser.certificateDisplayLabel),
      monsterName: dbUser.monster?.name ?? null,
      // Never echo raw display label or formulation text.
    });
  } catch (err) {
    console.error("certificate GET error:", err);
    return NextResponse.json(
      { error: "Что-то пошло не так. Попробуй ещё раз!" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const clerkId = await resolveClerkId(req);
    if (!clerkId) {
      return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }
    const isDev = process.env.NODE_ENV === "development";
    const testBypass = req.headers.get("x-test-bypass") === "true";
    if (!(isDev && testBypass) && !(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Нужно согласие родителя." },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      displayLabel?: string;
    };

    // Filter locally; never log body.displayLabel.
    if (body.displayLabel != null) {
      const filtered = filterCertificateDisplayLabel(body.displayLabel);
      if (!filtered.ok) {
        return NextResponse.json(
          { error: "Подпись не подходит.", code: "LABEL_REJECTED", reason: filtered.reason },
          { status: 400 }
        );
      }
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        conceptMasteries: true,
        formulationSubmissions: { where: { sessionId: CAPSTONE_SESSION_ID } },
        certificate: true,
      },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    if (dbUser.certificate) {
      return NextResponse.json({
        ok: true,
        alreadyIssued: true,
        certificate: {
          id: dbUser.certificate.id,
          recipientLabel: dbUser.certificate.recipientLabel,
          issuedDayBucket: dbUser.certificate.issuedDayBucket,
        },
      });
    }

    const completed = await completedSessionsFor(dbUser.id);
    const masteryByConcept: Record<string, number> = {};
    for (const row of dbUser.conceptMasteries) {
      masteryByConcept[row.concept] = row.mastery;
    }
    const formulation = dbUser.formulationSubmissions.find((f) => f.complete);
    const eligibility = evaluateCertificateEligibility({
      completedSessionIds: completed,
      masteryByConcept,
      formulationSubmitted: Boolean(formulation),
    });
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: "Сертификат ещё не доступен.", code: "NOT_ELIGIBLE", eligibility },
        { status: 403 }
      );
    }

    const recipientLabel = resolveCertificateLabel(
      body.displayLabel ?? dbUser.certificateDisplayLabel
    );

    if (body.displayLabel != null) {
      const filtered = filterCertificateDisplayLabel(body.displayLabel);
      if (filtered.ok && filtered.label !== DEFAULT_CERTIFICATE_LABEL) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { certificateDisplayLabel: filtered.label },
        });
      }
    }

    const id = mintCertificateId();
    const issued = await prisma.certificate.create({
      data: {
        id,
        userId: dbUser.id,
        recipientLabel,
        formulationVersion: formulation?.contentVersion ?? FORMULATION_CONTENT_VERSION,
        formulationDayBucket: formulation?.dayBucket ?? dayBucket(),
        issuedDayBucket: dayBucket(),
      },
    });

    return NextResponse.json({
      ok: true,
      alreadyIssued: false,
      certificate: {
        id: issued.id,
        recipientLabel: issued.recipientLabel,
        issuedDayBucket: issued.issuedDayBucket,
      },
    });
  } catch (err) {
    console.error("certificate POST error:", err);
    return NextResponse.json(
      { error: "Что-то пошло не так. Попробуй ещё раз!" },
      { status: 500 }
    );
  }
}
