# W5 operator metrics — local sample
Generated: 2026-07-31T17:12:47.933Z
DB: file:./dev.db (LOCAL ONLY)

## Query 1
```sql
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

-- …
```
rows: 1
- {"redeemed_families":0,"activated_with_first_pass":null}

## Query 2
```sql
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
  WHERE ac.redeemed
-- …
```
rows: 1
- {"redeemed":0,"day7_returners":null}

## Query 3
```sql
SELECT
  ta.sessionId AS session_id,
  COUNT(DISTINCT ta.userId) AS learners_with_pass
FROM TaskAttempt ta
WHERE ta.pass = 1 AND ta.sessionId IS NOT NULL
GROUP BY ta.sessionId
ORDER BY ta.sessionId
```
ERROR: SQLITE_ERROR: no such column: ta.sessionId

## Query 4
```sql
SELECT
  concept,
  COUNT(*) AS learners_at_threshold
FROM ConceptMastery
WHERE mastery >= 0.35
GROUP BY concept
ORDER BY concept
```
rows: 1
- {"concept":"sigmoid","learners_at_threshold":3}

## Query 5
```sql
SELECT
  occurredDayBucket,
  providerStage,
  causeEnum,
  COUNT(*) AS events,
  SUM(CASE WHEN resolvedByFallback = 1 THEN 1 ELSE 0 END) AS resolved_by_fallback
FROM DegradeEvent
GROUP BY occurredDayBucket, providerStage, causeEnum
ORDER BY occurredDayBucket DESC
```
ERROR: SQLITE_ERROR: no such table: DegradeEvent

## Query 6
```sql
SELECT
  ok,
  errorClass,
  COUNT(*) AS deliveries
FROM ReportDeliveryLog
GROUP BY ok, errorClass
```
ERROR: SQLITE_ERROR: no such table: ReportDeliveryLog

## Query 7
```sql
SELECT
  userId,
  COUNT(*) AS sessions,
  SUM(promptTokens + completionTokens) AS total_tokens,
  SUM(costMicros) AS total_cost_micros
FROM SessionCost
GROUP BY userId
ORDER BY total_cost_micros DESC
```
ERROR: SQLITE_ERROR: no such table: SessionCost
