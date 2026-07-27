import { week1Session1 } from "./week-1/session-1";
import { week1Session2 } from "./week-1/session-2";
import { week1Session3 } from "./week-1/session-3";
import { assertSessionsValid } from "./validate";
import type { SessionContent } from "./types";

const SESSIONS: SessionContent[] = [week1Session1, week1Session2, week1Session3];

/** All released sessions. Throws at import time if content is incomplete. */
export function loadCurriculum(): SessionContent[] {
  assertSessionsValid(SESSIONS);
  return SESSIONS;
}

export function getSession(id: string): SessionContent | undefined {
  return loadCurriculum().find((s) => s.id === id);
}

export type {
  SessionContent,
  ContentTask,
  PublicSessionContent,
  PublicContentTask,
} from "./types";
export {
  HINT_CRYSTAL_COST,
  TASK_PASS_CRYSTAL_REWARD,
  STARTER_CRYSTALS,
  toPublicSession,
} from "./types";
export { validateSession, assertSessionsValid } from "./validate";
