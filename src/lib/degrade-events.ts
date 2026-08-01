/**
 * Privacy-safe degrade observability (Section 3A.2).
 * Never stores child text, prompts, AI responses, Clerk IDs, IPs, or precise timestamps.
 */

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type ProviderStage = "interpreter" | "judge" | "tutor" | "moderation" | "other";
export type DegradeCause =
  | "provider_down"
  | "timeout"
  | "rate_limit"
  | "moderation_error"
  | "missing_key"
  | "unknown";

/** UTC calendar day bucket YYYY-MM-DD — coarse retention, not a precise timestamp. */
export function dayBucket(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Rotating opaque session id — NOT Clerk ID, NOT permanent child profile id.
 * Derived from a per-call nonce + day bucket so rows cannot be joined to identity.
 */
export function mintOpaqueSessionId(day: string = dayBucket()): string {
  const nonce = randomBytes(16).toString("hex");
  return createHash("sha256").update(`${day}:${nonce}`).digest("hex").slice(0, 32);
}

export async function recordDegradeEvent(input: {
  lessonId: string;
  providerStage: ProviderStage;
  causeEnum: DegradeCause;
  resolvedByFallback: boolean;
  /** Retention horizon in days (default 90). */
  retainDays?: number;
}): Promise<{ eventId: string }> {
  const occurredDayBucket = dayBucket();
  const retainDays = input.retainDays ?? 90;
  const retentionUntil = new Date(
    Date.UTC(
      Number(occurredDayBucket.slice(0, 4)),
      Number(occurredDayBucket.slice(5, 7)) - 1,
      Number(occurredDayBucket.slice(8, 10)) + retainDays
    )
  );
  const eventId = randomBytes(12).toString("hex");
  await prisma.degradeEvent.create({
    data: {
      eventId,
      opaqueSessionId: mintOpaqueSessionId(occurredDayBucket),
      lessonId: input.lessonId,
      providerStage: input.providerStage,
      causeEnum: input.causeEnum,
      occurredDayBucket,
      resolvedByFallback: input.resolvedByFallback,
      retentionUntil,
    },
  });
  return { eventId };
}
