import { z } from "zod";
import { UNCLEAR_REASON_CODES } from "./unclear-copy";
import type { TaskFamilyId } from "./types";

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

// An action id is whatever the task's rule world declares, so the shape is validated here
// and the VOCABULARY is checked against that world in `parseRuleProgram` — the same split
// the sequence family uses. A bare `z.string()` here would let anything through, so it is
// bounded: short, and no whitespace or punctuation an id never contains.
const ruleActionSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-z][a-z0-9_]*$/, "action id");
const ruleConditionSchema = z.union([
  z.object({ kind: z.literal("tile"), value: z.enum(["wall", "open", "trap", "goal"]) }),
  z.object({
    kind: z.literal("signal"),
    signal: z.string().min(1).max(32).regex(/^[a-z][a-z0-9_]*$/, "signal id"),
    value: z.string().min(1).max(32).regex(/^[a-z][a-z0-9_]*$/, "signal value"),
  }),
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

export const structuredProgramSchema = z.union([
  gridProgramSchema,
  sequenceProgramSchema,
  ruleProgramSchema,
  patternProgramSchema,
  claimProgramSchema,
]);

export type StructuredProgram = Extract<
  z.infer<typeof structuredProgramSchema>,
  { status: "ok" }
>;

/** Validate client-built actions against the server-resolved task family. */
export function parseStructuredProgram(
  family: TaskFamilyId,
  raw: unknown
): StructuredProgram | null {
  const schema =
    family === "grid-draw"
      ? gridProgramSchema
      : family === "sequence-world"
        ? sequenceProgramSchema
        : family === "rule-runner"
          ? ruleProgramSchema
          : family === "pattern-expand"
            ? patternProgramSchema
            : claimProgramSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success || parsed.data.status !== "ok") return null;
  return parsed.data as StructuredProgram;
}

/**
 * Thinking-curriculum attempt. sessionId+taskId required — server loads target/family/tier.
 * Client `target` / `family` / `concept` / `tier` are ignored if present (compat).
 */
export const attemptRequestSchema = z.object({
  utterance: z.string().trim().max(500).optional().default(""),
  /** Choice-mode fallback id when interpreter is down (deterministic tiles). */
  choiceId: z.string().trim().min(1).max(64).optional(),
  /** Closed learner-built program from a visible deterministic workspace. */
  program: structuredProgramSchema.optional(),
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
}).superRefine((value, context) => {
  const modes = [Boolean(value.choiceId), Boolean(value.utterance), Boolean(value.program)].filter(Boolean);
  if (modes.length !== 1) {
    context.addIssue({
      code: "custom",
      message: "exactly_one_attempt_mode_required",
      path: ["utterance"],
    });
  }
});

export type AttemptRequest = z.infer<typeof attemptRequestSchema>;
