import { week1Session1 } from "./week-1/session-1";
import { assertSessionsValid } from "./validate";
import type { SessionContent } from "./types";

const SESSIONS: SessionContent[] = [week1Session1];

/** All released sessions. Throws at import time if content is incomplete. */
export function loadCurriculum(): SessionContent[] {
  assertSessionsValid(SESSIONS);
  return SESSIONS;
}

export function getSession(id: string): SessionContent | undefined {
  return loadCurriculum().find((s) => s.id === id);
}

export type { SessionContent, ContentTask } from "./types";
export { validateSession, assertSessionsValid } from "./validate";
