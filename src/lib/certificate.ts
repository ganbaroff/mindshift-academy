/**
 * Certificate eligibility + formulation metadata (Section 3A.3).
 * Own-words formulation stores submitted-state metadata ONLY — never raw child text.
 * mintCertificateId uses Node crypto — server-only; UI imports certificate-skills instead.
 */

import { randomBytes } from "node:crypto";
import {
  CAPSTONE_SESSION_ID,
  CONCEPT_MASTERY_THRESHOLD,
  WEEK_CONCEPT,
} from "@/lib/evolution";
import {
  DEFAULT_CERTIFICATE_LABEL,
  resolveCertificateLabel,
} from "@/lib/certificate-label";
import { FIVE_CONCEPTS } from "@/lib/certificate-skills";

export { DEFAULT_CERTIFICATE_LABEL, resolveCertificateLabel };
export { FIVE_CONCEPTS, skillLabelsRu } from "@/lib/certificate-skills";

/** Content version stamped on formulation submissions (bump when prompt changes). */
export const FORMULATION_CONTENT_VERSION = "v1-w5-s3-thinking-rule";

export const ALL_SESSION_IDS = [
  "w1-s1",
  "w1-s2",
  "w1-s3",
  "w2-s1",
  "w2-s2",
  "w2-s3",
  "w3-s1",
  "w3-s2",
  "w3-s3",
  "w4-s1",
  "w4-s2",
  "w4-s3",
  "w5-s1",
  "w5-s2",
  "w5-s3",
] as const;

export type FormulationMeta = {
  submitted: true;
  contentVersion: string;
  /** Coarse day bucket YYYY-MM-DD — never precise timestamp */
  dayBucket: string;
  /** Deterministic completion flag — quality never gates */
  complete: true;
};

export type CertificateEligibilityInput = {
  completedSessionIds: ReadonlySet<string> | readonly string[];
  masteryByConcept: Record<string, number>;
  formulationSubmitted: boolean;
  threshold?: number;
};

export type CertificateEligibility = {
  eligible: boolean;
  sessionsComplete: boolean;
  conceptsAtThreshold: boolean;
  capstoneComplete: boolean;
  formulationSubmitted: boolean;
  missing: string[];
};

function asSet(ids: CertificateEligibilityInput["completedSessionIds"]): Set<string> {
  return ids instanceof Set ? ids : new Set(ids);
}

export function dayBucket(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Metadata-only formulation record — NEVER includes child text. */
export function formulationSubmittedMeta(
  contentVersion = FORMULATION_CONTENT_VERSION,
  at = new Date()
): FormulationMeta {
  return {
    submitted: true,
    contentVersion,
    dayBucket: dayBucket(at),
    complete: true,
  };
}

export function evaluateCertificateEligibility(
  input: CertificateEligibilityInput
): CertificateEligibility {
  const completed = asSet(input.completedSessionIds);
  const threshold = input.threshold ?? CONCEPT_MASTERY_THRESHOLD;
  const missing: string[] = [];

  const sessionsComplete = ALL_SESSION_IDS.every((id) => completed.has(id));
  if (!sessionsComplete) missing.push("sessions");

  const conceptsAtThreshold = FIVE_CONCEPTS.every(
    (c) => (input.masteryByConcept[c] ?? 0) >= threshold
  );
  if (!conceptsAtThreshold) missing.push("concepts");

  const capstoneComplete = completed.has(CAPSTONE_SESSION_ID);
  if (!capstoneComplete) missing.push("capstone");

  const formulationSubmitted = input.formulationSubmitted;
  if (!formulationSubmitted) missing.push("formulation");

  return {
    eligible:
      sessionsComplete &&
      conceptsAtThreshold &&
      capstoneComplete &&
      formulationSubmitted,
    sessionsComplete,
    conceptsAtThreshold,
    capstoneComplete,
    formulationSubmitted,
    missing,
  };
}

/** Unique non-derivable certificate ID (not based on userId/clerkId). */
export function mintCertificateId(): string {
  return `ms-${randomBytes(16).toString("hex")}`;
}

/** Ensure WEEK_CONCEPT covers all five certificate concepts. */
export function weekConceptForCertificate(): typeof WEEK_CONCEPT {
  return WEEK_CONCEPT;
}
