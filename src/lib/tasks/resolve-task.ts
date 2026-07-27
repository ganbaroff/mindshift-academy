/**
 * Resolve a curriculum task from the server catalog. Never trust client target/family/tier.
 */
import { getSession, type ContentTask, type SessionContent } from "@/content/curriculum";

export type ResolvedCurriculumTask = {
  session: SessionContent;
  task: ContentTask;
};

export function resolveCurriculumTask(
  sessionId: string,
  taskId: string
): ResolvedCurriculumTask | null {
  const session = getSession(sessionId);
  if (!session) return null;
  const task = session.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  return { session, task };
}

export function nextSessionId(sessionId: string): string | null {
  const order = ["w1-s1", "w1-s2", "w1-s3"];
  const i = order.indexOf(sessionId);
  if (i < 0 || i >= order.length - 1) return null;
  return order[i + 1];
}

/** Prior session that must be complete before this one unlocks. */
export function prerequisiteSessionId(sessionId: string): string | null {
  const order = ["w1-s1", "w1-s2", "w1-s3"];
  const i = order.indexOf(sessionId);
  if (i <= 0) return null;
  return order[i - 1];
}
