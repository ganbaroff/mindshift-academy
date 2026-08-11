import { PUBLIC_SEQUENCE_WORLDS } from "@/lib/tasks/sequence-worlds-public";
import type { ContentTask, SessionContent } from "./types";

export type ContentIssue = { sessionId: string; message: string };

/** A task carries the brief when it states all three things (08-UX-MONSTER-JOURNEY §2). */
export function hasTaskBrief(task: ContentTask): boolean {
  return Boolean(
    task.goalRu?.trim() && task.givenRu?.length && task.doneWhenRu?.trim()
  );
}

/** Any sign the author started briefing this task — used to demand they finish. */
function briefStarted(task: ContentTask): boolean {
  return Boolean(
    task.goalRu?.trim() ||
      task.givenRu?.length ||
      task.doneWhenRu?.trim() ||
      task.doneWhenFullRu?.trim()
  );
}

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

  if (session.requireCollision && !session.tasks.some((t) => t.role === "collision")) {
    issues.push({ sessionId: id, message: "required collision task is missing" });
  }
  if (session.requirePrediction && !session.tasks.some((t) => t.role === "prediction")) {
    issues.push({ sessionId: id, message: "required prediction task is missing" });
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
        // Success is pure execute→goal reached, so there is no answer key to demand. What
        // IS demanded is the world: without it every sequence task silently falls back to
        // the sandwich, which is exactly how week 2 came to teach one procedure fifteen
        // times. An author now has to choose, and choosing a world that does not exist
        // fails the build rather than the child.
        if (!task.worldId?.trim()) {
          issues.push({
            sessionId: id,
            message: `task ${task.id}: sequence-world needs worldId`,
          });
        } else if (!PUBLIC_SEQUENCE_WORLDS[task.worldId]) {
          issues.push({
            sessionId: id,
            message: `task ${task.id}: unknown sequence world "${task.worldId}"`,
          });
        }
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

  // Brief migration gate (§7 step 2): the fields are optional until an author starts
  // briefing a session — from that moment every task in it must state all three, or a
  // child meets a mixed session where some tasks say what "done" means and some do not.
  if (session.tasks.some(briefStarted)) {
    for (const task of session.tasks) {
      if (hasTaskBrief(task)) continue;
      const missing = [
        task.goalRu?.trim() ? null : "goalRu",
        task.givenRu?.length ? null : "givenRu",
        task.doneWhenRu?.trim() ? null : "doneWhenRu",
      ].filter(Boolean);
      issues.push({
        sessionId: id,
        message: `task ${task.id}: session is briefed but this task is missing ${missing.join(", ")}`,
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
