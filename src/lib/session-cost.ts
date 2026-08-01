/**
 * Per-session token/cost meter — zero free text (Lane-4 SessionCost).
 */

import { prisma } from "@/lib/prisma";

/** Soft ceiling for a single curriculum session (prompt+completion tokens). */
export const SESSION_TOKEN_BUDGET = 8_000;

export async function recordSessionCost(params: {
  userId: string;
  sessionId: string;
  promptTokens: number;
  completionTokens: number;
  /** Micro-USD estimate; keep integer. */
  costMicros?: number;
}): Promise<{
  promptTokens: number;
  completionTokens: number;
  costMicros: number;
  overBudget: boolean;
}> {
  const costMicros = params.costMicros ?? 0;
  const row = await prisma.sessionCost.upsert({
    where: {
      userId_sessionId: { userId: params.userId, sessionId: params.sessionId },
    },
    create: {
      userId: params.userId,
      sessionId: params.sessionId,
      promptTokens: Math.max(0, params.promptTokens),
      completionTokens: Math.max(0, params.completionTokens),
      costMicros,
    },
    update: {
      promptTokens: { increment: Math.max(0, params.promptTokens) },
      completionTokens: { increment: Math.max(0, params.completionTokens) },
      costMicros: { increment: costMicros },
    },
  });
  const total = row.promptTokens + row.completionTokens;
  return {
    promptTokens: row.promptTokens,
    completionTokens: row.completionTokens,
    costMicros: row.costMicros,
    overBudget: total > SESSION_TOKEN_BUDGET,
  };
}

/** Rough deterministic token estimate from string length (fake/CI). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
