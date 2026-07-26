/**
 * Sprint 3 — HTTP client for Atlas learning API (Cloud Run).
 */

import { randomUUID } from "node:crypto";
import {
  LEARNING_SCHEMA_VERSION,
  type AtlasLearningReceipt,
  type LearningDecideInput,
  type LearningOutcomeInput,
} from "./contracts";

export class AtlasHttpError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "AtlasHttpError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveApiUrl(): string {
  const url = process.env.ATLAS_LEARNING_API_URL?.replace(/\/$/, "");
  if (!url) {
    throw new AtlasHttpError(
      "ATLAS_LEARNING_API_URL is not configured",
      "ATLAS_API_URL_MISSING",
    );
  }
  return url;
}

function resolveApiKey(): string {
  const key = process.env.ATLAS_LEARNING_API_KEY ?? "";
  if (!key) {
    throw new AtlasHttpError(
      "ATLAS_LEARNING_API_KEY is not configured",
      "ATLAS_API_KEY_MISSING",
    );
  }
  return key;
}

function makeRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

async function fetchWithRetry(
  path: string,
  body: unknown,
  idempotencyKey: string,
): Promise<AtlasLearningReceipt> {
  const baseUrl = resolveApiUrl();
  const apiKey = resolveApiKey();
  const timeoutMs = Number(process.env.ATLAS_LEARNING_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const receipt = (await res.json()) as AtlasLearningReceipt;
      if (res.status === 409 && receipt.status === "duplicate") {
        throw new AtlasHttpError(
          receipt.error ?? "duplicate in-flight request",
          "ATLAS_DUPLICATE",
          res.status,
        );
      }
      if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new AtlasHttpError(
          receipt.error ?? `Atlas HTTP ${res.status}`,
          "ATLAS_HTTP_ERROR",
          res.status,
        );
      }
      return receipt;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1 && !(err instanceof AtlasHttpError && err.status === 401)) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new AtlasHttpError("Atlas request failed", "ATLAS_HTTP_FAILED");
}

export async function atlasHttpDecide(
  idempotencyKey: string,
  payload: LearningDecideInput,
  requestId = makeRequestId(),
): Promise<AtlasLearningReceipt> {
  return fetchWithRetry(
    "/v1/learning/decide",
    {
      schemaVersion: LEARNING_SCHEMA_VERSION,
      kind: "decide",
      requestId,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      issuedBy: "volaura",
      payload,
    },
    idempotencyKey,
  );
}

export async function atlasHttpOutcome(
  idempotencyKey: string,
  payload: LearningOutcomeInput,
  requestId = makeRequestId(),
): Promise<AtlasLearningReceipt> {
  return fetchWithRetry(
    "/v1/learning/outcome",
    {
      schemaVersion: LEARNING_SCHEMA_VERSION,
      kind: "outcome",
      requestId,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      issuedBy: "volaura",
      payload,
    },
    idempotencyKey,
  );
}

export async function atlasHttpHealth(): Promise<boolean> {
  const baseUrl = resolveApiUrl();
  const res = await fetch(`${baseUrl}/health`, { method: "GET" });
  if (!res.ok) return false;
  const json = (await res.json()) as { ok?: boolean };
  return json.ok === true;
}
