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

const ruleActionSchema = z.enum(["step", "turn_left", "turn_right", "wait", "stop"]);
const ruleConditionSchema = z.union([
  z.object({ kind: z.literal("tile"), value: z.enum(["wall", "open", "trap", "goal"]) }),
  z.object({ kind: z.literal("always") }),
]);

export const ruleProgramSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    rules: z
      .array(
        z.object({
          if: ruleConditionSchema,
          then: ruleActionSchema,
          else: ruleActionSchema.optional(),
        })
      )
      .min(1),
  }),
  z.object({
    status: z.literal("unclear"),
    reasonCode: unclearReasonSchema,
  }),
]);

export const patternProgramSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    rule: z.union([
      z.object({
        kind: z.literal("arithmetic"),
        start: z.number(),
        step: z.number(),
      }),
      z.object({
        kind: z.literal("cycle"),
        items: z.array(z.string().min(1)).min(1),
      }),
    ]),
  }),
  z.object({
    status: z.literal("unclear"),
    reasonCode: unclearReasonSchema,
  }),
]);

export const claimProgramSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    labels: z.record(z.string(), z.boolean()),
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
  utterance: z.string().trim().max(500).optional().default(""),
  /** Choice-mode fallback id when interpreter is down (deterministic tiles). */
  choiceId: z.string().trim().min(1).max(64).optional(),
  sessionId: z.string().min(1).max(64),
  taskId: z.string().min(1).max(64),
  /** Idempotency for TaskAttempt — never stores utterance. */
  eventId: z.string().min(8).max(100),
  family: z
    .enum(["grid-draw", "sequence-world", "rule-runner", "pattern-expand", "claim-check"])
    .optional(),
  target: z.array(cellSchema).optional(),
  concept: z.string().min(1).max(64).optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
}).refine((v) => Boolean(v.choiceId) || (v.utterance && v.utterance.length > 0), {
  message: "utterance_or_choice_required",
});

export type AttemptRequest = z.infer<typeof attemptRequestSchema>;
