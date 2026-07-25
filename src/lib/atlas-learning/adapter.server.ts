/**
 * Atlas learning adapter — file exchange + CLI drain (pilot transport).
 * VOLAURA writes requests; Atlas writes receipts; mastery stays here.
 */

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import {
  LEARNING_SCHEMA_VERSION,
  SIGMOID_DECIDE_FIXTURE,
  type AtlasLearningReceipt,
  type LearningDecideInput,
  type LearningOutcomeInput,
} from "./contracts";
import { mapActionToSigmoidLesson, renderSigmoidLessonHtml } from "./sigmoid-lesson";
import { masteryAfterOutcome } from "./mastery";

export class AtlasAdapterError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AtlasAdapterError";
    this.code = code;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function resolveAtlasExchangeDir(): string {
  const dir = process.env.ATLAS_LEARNING_EXCHANGE_DIR;
  if (!dir) {
    throw new AtlasAdapterError(
      "ATLAS_LEARNING_EXCHANGE_DIR is not configured",
      "ATLAS_EXCHANGE_MISSING",
    );
  }
  mkdirSync(join(dir, "requests"), { recursive: true });
  mkdirSync(join(dir, "receipts"), { recursive: true });
  return dir;
}

function atlasSideEffectDirs(exchangeDir: string): Record<string, string> {
  const base = join(exchangeDir, "atlas-state");
  return {
    ATLAS_LEARNING_EXCHANGE_DIR: exchangeDir,
    ATLAS_EVIDENCE_DIR: join(base, "evidence"),
    ATLAS_EXEC_GRAPH_DIR: join(base, "exec-graph"),
    ATLAS_SPEND_RECEIPT_DIR: join(base, "spend"),
    SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
  };
}

function receiptPath(exchangeDir: string, idempotencyKey: string): string {
  const safe = idempotencyKey.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(exchangeDir, "receipts", `${safe}.json`);
}

function writeDecideRequest(
  exchangeDir: string,
  idempotencyKey: string,
  requestId: string,
  payload: LearningDecideInput,
): void {
  const body = {
    schemaVersion: LEARNING_SCHEMA_VERSION,
    requestId,
    idempotencyKey,
    createdAt: nowIso(),
    issuedBy: "volaura",
    kind: "decide" as const,
    payload,
  };
  mkdirSync(join(exchangeDir, "requests"), { recursive: true });
  writeFileSync(
    join(exchangeDir, "requests", `${requestId}.json`),
    JSON.stringify(body, null, 2),
    "utf8",
  );
}

function writeOutcomeRequest(
  exchangeDir: string,
  idempotencyKey: string,
  requestId: string,
  payload: LearningOutcomeInput,
): void {
  const body = {
    schemaVersion: LEARNING_SCHEMA_VERSION,
    requestId,
    idempotencyKey,
    createdAt: nowIso(),
    issuedBy: "volaura",
    kind: "outcome" as const,
    payload,
  };
  mkdirSync(join(exchangeDir, "requests"), { recursive: true });
  writeFileSync(
    join(exchangeDir, "requests", `${requestId}.json`),
    JSON.stringify(body, null, 2),
    "utf8",
  );
}

function readReceipt(exchangeDir: string, idempotencyKey: string): AtlasLearningReceipt {
  const path = receiptPath(exchangeDir, idempotencyKey);
  if (!existsSync(path)) {
    throw new AtlasAdapterError(
      `Atlas receipt missing at ${path}`,
      "ATLAS_RECEIPT_MISSING",
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as AtlasLearningReceipt;
}

/** Invoke `node <ATLAS_CLI_JS> learning drain`. */
export function drainAtlasLearning(exchangeDir: string): void {
  const cliJs = process.env.ATLAS_CLI_JS;
  if (!cliJs) {
    throw new AtlasAdapterError(
      "ATLAS_CLI_JS is not configured (path to atlas dist/cli.js)",
      "ATLAS_CLI_MISSING",
    );
  }
  if (!existsSync(cliJs)) {
    throw new AtlasAdapterError(`Atlas CLI not found: ${cliJs}`, "ATLAS_CLI_NOT_FOUND");
  }

  const env = {
    ...process.env,
    ...atlasSideEffectDirs(exchangeDir),
  };

  const result = spawnSync(process.execPath, [cliJs, "learning", "drain"], {
    env,
    encoding: "utf8",
    timeout: 60_000,
  });

  if (result.error) {
    throw new AtlasAdapterError(result.error.message, "ATLAS_DRAIN_ERROR");
  }
  if (result.status !== 0) {
    throw new AtlasAdapterError(
      (result.stderr || result.stdout || "atlas learning drain failed").slice(0, 500),
      "ATLAS_DRAIN_FAILED",
    );
  }
}

export interface DecideParams {
  userId: string;
  learnerId: string;
  input?: Partial<LearningDecideInput>;
  idempotencyKey?: string;
}

export interface DecideResult {
  receipt: AtlasLearningReceipt;
  lessonHtml: string;
  lessonFormat: string;
  sessionId: string;
  mastery: number;
}

export async function atlasDecide(params: DecideParams): Promise<DecideResult> {
  const exchangeDir = resolveAtlasExchangeDir();
  const payload: LearningDecideInput = {
    ...SIGMOID_DECIDE_FIXTURE,
    learnerId: params.learnerId,
  };
  if (params.input) {
    for (const [key, value] of Object.entries(params.input)) {
      if (value !== undefined) {
        (payload as Record<string, unknown>)[key] = value;
      }
    }
  }
  const idempotencyKey =
    params.idempotencyKey ?? `idem_${params.learnerId}_${payload.concept}_${Date.now()}`;
  const requestId = makeRequestId();

  const existing = await prisma.atlasLearningSession.findUnique({
    where: { idempotencyKey },
  });
  if (existing?.decideReceiptJson) {
    const receipt = JSON.parse(existing.decideReceiptJson) as AtlasLearningReceipt;
    const lesson = mapActionToSigmoidLesson(receipt.decision!.action);
    const masteryRow = await prisma.conceptMastery.findUnique({
      where: { userId_concept: { userId: params.userId, concept: payload.concept } },
    });
    return {
      receipt,
      lessonHtml: renderSigmoidLessonHtml(lesson),
      lessonFormat: lesson.format,
      sessionId: existing.id,
      mastery: masteryRow?.mastery ?? payload.mastery,
    };
  }

  writeDecideRequest(exchangeDir, idempotencyKey, requestId, payload);
  drainAtlasLearning(exchangeDir);
  const receipt = readReceipt(exchangeDir, idempotencyKey);

  if (receipt.status !== "completed" || !receipt.decision) {
    throw new AtlasAdapterError(
      receipt.error ?? `Atlas decide failed: ${receipt.status}`,
      "ATLAS_DECIDE_FAILED",
    );
  }

  const lesson = mapActionToSigmoidLesson(receipt.decision.action);
  const lessonHtml = renderSigmoidLessonHtml(lesson);

  await prisma.conceptMastery.upsert({
    where: { userId_concept: { userId: params.userId, concept: payload.concept } },
    update: {},
    create: {
      userId: params.userId,
      concept: payload.concept,
      mastery: payload.mastery,
    },
  });

  const session = await prisma.atlasLearningSession.create({
    data: {
      userId: params.userId,
      concept: payload.concept,
      idempotencyKey,
      requestId,
      decisionId: receipt.decisionId ?? receipt.decision.decisionId,
      goalId: receipt.goalId,
      decisionScore: receipt.decision.decisionScore,
      action: receipt.decision.action,
      lessonFormat: lesson.format,
      masteryBefore: payload.mastery,
      decideReceiptJson: JSON.stringify(receipt),
    },
  });

  const masteryRow = await prisma.conceptMastery.findUniqueOrThrow({
    where: { userId_concept: { userId: params.userId, concept: payload.concept } },
  });

  return {
    receipt,
    lessonHtml,
    lessonFormat: lesson.format,
    sessionId: session.id,
    mastery: masteryRow.mastery,
  };
}

export interface OutcomeParams {
  userId: string;
  learnerId: string;
  idempotencyKey: string;
  correct: boolean;
  completed?: boolean;
  responseTimeSec?: number;
  selfReportedConfidence?: number;
}

export interface OutcomeResult {
  receipt: AtlasLearningReceipt;
  masteryBefore: number;
  masteryAfter: number;
}

export async function atlasOutcome(params: OutcomeParams): Promise<OutcomeResult> {
  const exchangeDir = resolveAtlasExchangeDir();
  const session = await prisma.atlasLearningSession.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (!session) {
    throw new AtlasAdapterError("Unknown learning session", "SESSION_NOT_FOUND");
  }
  if (session.outcomeReceiptJson) {
    const receipt = JSON.parse(session.outcomeReceiptJson) as AtlasLearningReceipt;
    return {
      receipt,
      masteryBefore: session.masteryBefore,
      masteryAfter: session.masteryAfter ?? session.masteryBefore,
    };
  }

  const masteryRow = await prisma.conceptMastery.findUniqueOrThrow({
    where: { userId_concept: { userId: params.userId, concept: session.concept } },
  });
  const masteryBefore = masteryRow.mastery;
  const masteryAfter = masteryAfterOutcome(masteryBefore, params.correct);

  const requestId = makeRequestId();
  const outcomeKey = `${params.idempotencyKey}_outcome`;
  const payload: LearningOutcomeInput = {
    learnerId: params.learnerId,
    concept: session.concept,
    decisionCorrelationId: params.idempotencyKey,
    completed: params.completed ?? true,
    correct: params.correct,
    responseTimeSec: params.responseTimeSec ?? 15,
    selfReportedConfidence: params.selfReportedConfidence,
  };

  writeOutcomeRequest(exchangeDir, outcomeKey, requestId, payload);
  drainAtlasLearning(exchangeDir);
  const receipt = readReceipt(exchangeDir, outcomeKey);

  if (receipt.status !== "completed") {
    throw new AtlasAdapterError(
      receipt.error ?? `Atlas outcome failed: ${receipt.status}`,
      "ATLAS_OUTCOME_FAILED",
    );
  }

  await prisma.conceptMastery.update({
    where: { userId_concept: { userId: params.userId, concept: session.concept } },
    data: { mastery: masteryAfter },
  });

  await prisma.atlasLearningSession.update({
    where: { id: session.id },
    data: {
      masteryAfter,
      outcomeReceiptJson: JSON.stringify(receipt),
      completedAt: new Date(),
    },
  });

  return { receipt, masteryBefore, masteryAfter };
}
