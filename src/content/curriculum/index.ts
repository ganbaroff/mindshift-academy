import { week1Session1 } from "./week-1/session-1";
import { week1Session2 } from "./week-1/session-2";
import { week1Session3 } from "./week-1/session-3";
import { week2Session1 } from "./week-2/session-1";
import { week2Session2 } from "./week-2/session-2";
import { week2Session3 } from "./week-2/session-3";
import { week3Session1 } from "./week-3/session-1";
import { week3Session2 } from "./week-3/session-2";
import { week3Session3 } from "./week-3/session-3";
import { week4Session1 } from "./week-4/session-1";
import { week4Session2 } from "./week-4/session-2";
import { week4Session3 } from "./week-4/session-3";
import { week5Session1 } from "./week-5/session-1";
import { week5Session2 } from "./week-5/session-2";
import { week5Session3 } from "./week-5/session-3";
import { assertSessionsValid } from "./validate";
import type { SessionContent } from "./types";

const SESSIONS: SessionContent[] = [
  week1Session1,
  week1Session2,
  week1Session3,
  week2Session1,
  week2Session2,
  week2Session3,
  week3Session1,
  week3Session2,
  week3Session3,
  week4Session1,
  week4Session2,
  week4Session3,
  week5Session1,
  week5Session2,
  week5Session3,
];

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
