-- MindShift V1 — operator metrics SQL pack (Appendix B)
-- LOCAL ONLY. Run via: node scripts/w5-metrics-local.mjs
-- Forbidden: third-party analytics, pixels, fingerprinting, raw child text, cross-child PII dashboards.
-- Threshold mastery: 0.35 (CONCEPT_MASTERY_THRESHOLD)

-- 1) Activation: AccessCode.redeemedAt -> first completed session (any TaskAttempt pass)
-- Derivation: redeemed codes with at least one passing TaskAttempt for that clerkId's User.
SELECT
  COUNT(*) AS redeemed_families,
  SUM(CASE WHEN first_pass IS NOT NULL THEN 1 ELSE 0 END) AS activated_with_first_pass
FROM (
  SELECT
    ac.id,
    ac.redeemedAt,
    (
      SELECT MIN(ta.createdAt)
      FROM TaskAttempt ta
      JOIN User u ON u.id = ta.userId
      WHERE u.clerkId = ac.clerkId AND ta.pass = 1
    ) AS first_pass
  FROM AccessCode ac
  WHERE ac.redeemedAt IS NOT NULL
) AS act;

-- 2) Day-7 return: activity (TaskAttempt) on day >= redeemedAt+7
SELECT
  COUNT(*) AS redeemed,
  SUM(CASE WHEN returned = 1 THEN 1 ELSE 0 END) AS day7_returners
FROM (
  SELECT
    ac.id,
    CASE WHEN EXISTS (
      SELECT 1
      FROM TaskAttempt ta
      JOIN User u ON u.id = ta.userId
      WHERE u.clerkId = ac.clerkId
        AND ta.createdAt >= datetime(ac.redeemedAt, '+7 days')
    ) THEN 1 ELSE 0 END AS returned
  FROM AccessCode ac
  WHERE ac.redeemedAt IS NOT NULL
) AS d7;

-- 3) Completion: distinct sessions with transfer/capstone-style passes (by sessionId)
SELECT
  ta.sessionId AS session_id,
  COUNT(DISTINCT ta.userId) AS learners_with_pass
FROM TaskAttempt ta
WHERE ta.pass = 1 AND ta.sessionId IS NOT NULL
GROUP BY ta.sessionId
ORDER BY ta.sessionId;

-- 4) Mastery: ConceptMastery >= 0.35
SELECT
  concept,
  COUNT(*) AS learners_at_threshold
FROM ConceptMastery
WHERE mastery >= 0.35
GROUP BY concept
ORDER BY concept;

-- 5) Fallback frequency: DegradeEvent (pseudonymous; no child text)
SELECT
  occurredDayBucket,
  providerStage,
  causeEnum,
  COUNT(*) AS events,
  SUM(CASE WHEN resolvedByFallback = 1 THEN 1 ELSE 0 END) AS resolved_by_fallback
FROM DegradeEvent
GROUP BY occurredDayBucket, providerStage, causeEnum
ORDER BY occurredDayBucket DESC;

-- 6) Report delivery: ReportDeliveryLog
SELECT
  ok,
  errorClass,
  COUNT(*) AS deliveries
FROM ReportDeliveryLog
GROUP BY ok, errorClass;

-- 7) Cost per learner: SessionCost aggregates (tokens/cost only)
SELECT
  userId,
  COUNT(*) AS sessions,
  SUM(promptTokens + completionTokens) AS total_tokens,
  SUM(costMicros) AS total_cost_micros
FROM SessionCost
GROUP BY userId
ORDER BY total_cost_micros DESC;
