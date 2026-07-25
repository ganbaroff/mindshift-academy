/**
 * Atlas ↔ VOLAURA learning contracts (mirrors atlas-cli src/learning/contracts.ts v1.0).
 * VOLAURA owns mastery; Atlas owns decision + audit.
 */

import { z } from "zod";

export const LEARNING_SCHEMA_VERSION = "1.0" as const;

export const learningActionSchema = z.enum([
  "VISUAL_EXPLANATION",
  "TEXT_EXPLANATION",
  "FLASHCARDS",
  "GRILL_ME",
  "PRACTICE_QUIZ",
  "SCHEMA_DIAGRAM",
  "AUDIO_EXPLANATION",
]);
export type LearningAction = z.infer<typeof learningActionSchema>;

export const difficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const energyLevelSchema = z.enum(["low", "medium", "high"]);
export type EnergyLevel = z.infer<typeof energyLevelSchema>;

const requestEnvelopeSchema = z.object({
  schemaVersion: z.literal(LEARNING_SCHEMA_VERSION),
  requestId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  createdAt: z.string().datetime(),
  issuedBy: z.string().min(1),
  correlationId: z.string().min(1).optional(),
});

export const learningDecideInputSchema = z.object({
  learnerId: z.string().min(1),
  concept: z.string().min(1),
  mastery: z.number().min(0).max(1),
  lastAnswers: z.array(z.boolean()).min(1),
  responseTimeSec: z.number().min(0),
  energy: energyLevelSchema,
});
export type LearningDecideInput = z.infer<typeof learningDecideInputSchema>;

export const learningOutcomeInputSchema = z.object({
  learnerId: z.string().min(1),
  concept: z.string().min(1),
  decisionCorrelationId: z.string().min(1),
  completed: z.boolean(),
  correct: z.boolean(),
  responseTimeSec: z.number().min(0),
  selfReportedConfidence: z.number().min(0).max(1).optional(),
});
export type LearningOutcomeInput = z.infer<typeof learningOutcomeInputSchema>;

export const atlasLearningRequestSchema = z.discriminatedUnion("kind", [
  requestEnvelopeSchema.extend({
    kind: z.literal("decide"),
    payload: learningDecideInputSchema,
  }),
  requestEnvelopeSchema.extend({
    kind: z.literal("outcome"),
    payload: learningOutcomeInputSchema,
  }),
]);
export type AtlasLearningRequest = z.infer<typeof atlasLearningRequestSchema>;

export const atlasLearningDecisionSchema = z.object({
  decisionId: z.string().min(1),
  action: learningActionSchema,
  difficulty: difficultySchema,
  reason: z.string().min(1),
  decisionScore: z.number().min(0).max(1),
  alternatives: z.array(learningActionSchema).max(5),
  requiresHumanReview: z.boolean(),
});
export type AtlasLearningDecision = z.infer<typeof atlasLearningDecisionSchema>;

export type AtlasLearningReceiptStatus =
  | "completed"
  | "failed"
  | "duplicate"
  | "readonly"
  | "rejected";

export interface AtlasLearningReceipt {
  schemaVersion: typeof LEARNING_SCHEMA_VERSION;
  requestId: string;
  idempotencyKey: string;
  createdAt: string;
  decisionId?: string;
  correlationId: string;
  status: AtlasLearningReceiptStatus;
  updatedAt: string;
  kind: "decide" | "outcome";
  goalId?: string;
  decision?: AtlasLearningDecision;
  error?: string;
  spendCorrelationId?: string;
  evidenceClaimId?: string;
}

/** Sigmoid Sprint 2 fixture — canonical pilot input. */
export const SIGMOID_DECIDE_FIXTURE: LearningDecideInput = {
  learnerId: "123",
  concept: "sigmoid",
  mastery: 0.35,
  lastAnswers: [false, true, false],
  responseTimeSec: 28,
  energy: "medium",
};

export function parseAtlasLearningReceipt(raw: unknown): AtlasLearningReceipt {
  return raw as AtlasLearningReceipt;
}
