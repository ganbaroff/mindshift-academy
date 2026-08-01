/**
 * Resume position is DERIVED from TaskAttempt rows — never a separate cursor table.
 * Contract: docs/architecture/MINDSHIFT-LEARNER-STATE-CONTRACT.md §3, §6.
 */

import type { ContentTask } from "@/content/curriculum/types";

export type AttemptEvidence = {
  taskId: string;
  pass: boolean;
  tier: number;
};

export type ResumeDerivation = {
  passedTaskIds: string[];
  /** Index of first incomplete task; equals tasks.length when all done. */
  taskIndex: number;
  results: { id: string; role: ContentTask["role"]; pass: boolean; tier: number }[];
};

/**
 * Pure. Given catalog tasks + attempt evidence for this session, re-derive arc position.
 * A task counts as passed when any evidence row has pass=true at tier >= minTier.
 */
export function deriveResumeFromAttempts(
  tasks: Pick<ContentTask, "id" | "role" | "tier">[],
  attempts: AttemptEvidence[],
  minTier: 1 | 2 | 3 = 1
): ResumeDerivation {
  const bestPassTier = new Map<string, number>();
  for (const a of attempts) {
    if (!a.pass) continue;
    const prev = bestPassTier.get(a.taskId) ?? 0;
    if (a.tier > prev) bestPassTier.set(a.taskId, a.tier);
  }

  const passedTaskIds: string[] = [];
  const results: ResumeDerivation["results"] = [];
  for (const t of tasks) {
    const tier = bestPassTier.get(t.id);
    if (tier != null && tier >= minTier) {
      passedTaskIds.push(t.id);
      results.push({ id: t.id, role: t.role, pass: true, tier });
    }
  }

  const taskIndex = tasks.findIndex((t) => !passedTaskIds.includes(t.id));
  return {
    passedTaskIds,
    taskIndex: taskIndex < 0 ? tasks.length : taskIndex,
    results,
  };
}

/** Encode opaque attempt event ids that still carry session/task for recovery parsing. */
export function curriculumAttemptEventId(
  sessionId: string,
  taskId: string,
  nonce: string
): string {
  return `attempt:${sessionId}:${taskId}:${nonce}`;
}

export function parseCurriculumAttemptEventId(
  eventId: string
): { sessionId: string; taskId: string } | null {
  if (!eventId.startsWith("attempt:")) return null;
  const parts = eventId.split(":");
  // attempt : sessionId : taskId : nonce… (taskId may contain no colons in our catalog)
  if (parts.length < 4) return null;
  const sessionId = parts[1];
  const taskId = parts[2];
  if (!sessionId || !taskId) return null;
  return { sessionId, taskId };
}
