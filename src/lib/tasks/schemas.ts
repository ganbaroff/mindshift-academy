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

export const attemptRequestSchema = z.object({
  family: z.enum(["grid-draw", "sequence-world"]),
  utterance: z.string().min(1).max(500),
  /** 0-based cells for grid-draw. Ignored for sequence-world. */
  target: z.array(cellSchema).optional(),
  /** Thinking-curriculum concept id — when set, mastery/spacing are updated. */
  concept: z.string().min(1).max(64).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  /** Idempotency for TaskAttempt — never stores utterance. */
  eventId: z.string().min(8).max(100).optional(),
  sessionId: z.string().min(1).max(64).optional(),
  taskId: z.string().min(1).max(64).optional(),
});

export type AttemptRequest = z.infer<typeof attemptRequestSchema>;
