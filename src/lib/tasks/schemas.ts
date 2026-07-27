import { z } from "zod";
import { UNCLEAR_REASON_CODES } from "./unclear-copy";

export const unclearReasonSchema = z.enum(
  UNCLEAR_REASON_CODES as [string, ...string[]]
);

export const cellSchema = z.tuple([z.number().int(), z.number().int()]);

export const gridProgramSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    cells: z.array(cellSchema).min(1),
  }),
  z.object({
    status: z.literal("unclear"),
    reasonCode: unclearReasonSchema,
  }),
]);

export const sequenceProgramSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    steps: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    status: z.literal("unclear"),
    reasonCode: unclearReasonSchema,
  }),
]);

/**
 * Thinking-curriculum attempt. sessionId+taskId required — server loads target/family/tier.
 * Client `target` / `family` / `concept` / `tier` are ignored if present (compat).
 */
export const attemptRequestSchema = z.object({
  utterance: z.string().trim().min(1).max(500),
  sessionId: z.string().min(1).max(64),
  taskId: z.string().min(1).max(64),
  /** Idempotency for TaskAttempt — never stores utterance. */
  eventId: z.string().min(8).max(100),
  // Legacy fields — stripped; kept optional so old clients don't 400 on unknown... 
  // actually zod strips unknown by default. Explicit ignore:
  family: z.enum(["grid-draw", "sequence-world"]).optional(),
  target: z.array(cellSchema).optional(),
  concept: z.string().min(1).max(64).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export type AttemptRequest = z.infer<typeof attemptRequestSchema>;
