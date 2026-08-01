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

    // Deterministic check payload required per family (handoff W1 + §9).
    switch (task.family) {
      case "grid-draw":
        if (!task.target?.length) {
          issues.push({
            sessionId: id,
            message: `task ${task.id}: grid-draw needs deterministic target`,
          });
        }
        break;
      case "sequence-world":
        // Success is pure execute→served; no extra payload required.
        break;
      case "rule-runner":
        if (!task.ruleMaps?.length) {
          issues.push({
            sessionId: id,
            message: `task ${task.id}: rule-runner needs ruleMaps (deterministic check)`,
          });
        }
        break;
      case "pattern-expand":
        if (!task.patternExpected?.length) {
          issues.push({
            sessionId: id,
            message: `task ${task.id}: pattern-expand needs patternExpected`,
          });
        }
        break;
      case "claim-check":
        if (!task.claims?.length) {
          issues.push({
            sessionId: id,
            message: `task ${task.id}: claim-check needs claims`,
          });
        } else {
          const hasTrue = task.claims.some((c) => c.truth === true);
          const hasFalse = task.claims.some((c) => c.truth === false);
          if (!hasTrue || !hasFalse) {
            issues.push({
              sessionId: id,
              message: `task ${task.id}: claim-check needs both true and false claims`,
            });
          }
        }
        break;
      default:
        issues.push({
          sessionId: id,
          message: `task ${task.id}: unknown family`,
        });
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
