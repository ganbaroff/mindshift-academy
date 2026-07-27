import type { SessionContent } from "./types";

export type ContentIssue = { sessionId: string; message: string };

/** Build-time / test-time validator. Rejects sessions that cannot teach. */
export function validateSession(session: SessionContent): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const id = session.id;

  if (!session.concept?.trim()) issues.push({ sessionId: id, message: "missing concept" });
  if (!session.misconception?.trim()) {
    issues.push({ sessionId: id, message: "missing misconception" });
  }
  if (!session.explanationRu?.trim()) {
    issues.push({ sessionId: id, message: "missing explanation" });
  }
  if (!session.dinnerQuestionRu?.trim()) {
    issues.push({ sessionId: id, message: "missing dinner question" });
  }

  const transfer = session.tasks.filter((t) => t.role === "transfer");
  if (transfer.length !== 1) {
    issues.push({ sessionId: id, message: "exactly one transfer task required" });
  }

  const practice = session.tasks.filter((t) => t.role === "practice");
  if (practice.length < session.practiceRequired) {
    issues.push({
      sessionId: id,
      message: `need ≥${session.practiceRequired} practice tasks, have ${practice.length}`,
    });
  }

  for (const task of session.tasks) {
    if (!task.promptRu?.trim()) {
      issues.push({ sessionId: id, message: `task ${task.id}: empty prompt` });
    }
    if (!task.hintRu?.trim()) {
      issues.push({ sessionId: id, message: `task ${task.id}: empty hintRu (scaffold required)` });
    }
    if (task.family === "grid-draw") {
      if (!task.target?.length) {
        issues.push({ sessionId: id, message: `task ${task.id}: grid-draw needs target` });
      }
    }
  }

  return issues;
}

export function assertSessionsValid(sessions: SessionContent[]): void {
  const issues = sessions.flatMap(validateSession);
  if (issues.length) {
    throw new Error(
      `curriculum invalid:\n${issues.map((i) => `${i.sessionId}: ${i.message}`).join("\n")}`
    );
  }
}
