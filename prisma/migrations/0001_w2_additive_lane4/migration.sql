-- W2 additive-only delta (Section 3A.1 + 3A.2).
-- NEVER derived as from-empty. Safe on non-empty DBs: CREATE IF NOT EXISTS + ADD COLUMN.
-- Do NOT apply to production without CEO approval + live Turso schema receipt.

-- Resume columns on TaskAttempt (nullable for legacy rows)
ALTER TABLE "TaskAttempt" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "TaskAttempt" ADD COLUMN "taskId" TEXT;

CREATE INDEX IF NOT EXISTS "TaskAttempt_userId_sessionId_idx" ON "TaskAttempt"("userId", "sessionId");

-- DegradeEvent — pseudonymous, no child text / Clerk ID / IP / precise timestamps (3A.2)
CREATE TABLE IF NOT EXISTS "DegradeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "opaqueSessionId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "providerStage" TEXT NOT NULL,
    "causeEnum" TEXT NOT NULL,
    "occurredDayBucket" TEXT NOT NULL,
    "resolvedByFallback" INTEGER NOT NULL,
    "retentionUntil" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "DegradeEvent_eventId_key" ON "DegradeEvent"("eventId");

-- ReportDeliveryLog — clerkId ref + ok + errorClass only
CREATE TABLE IF NOT EXISTS "ReportDeliveryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkId" TEXT NOT NULL,
    "userId" TEXT,
    "ok" INTEGER NOT NULL,
    "errorClass" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReportDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ReportDeliveryLog_clerkId_idx" ON "ReportDeliveryLog"("clerkId");

-- SessionCost — tokens/cost only, zero text
CREATE TABLE IF NOT EXISTS "SessionCost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionCost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SessionCost_userId_sessionId_key" ON "SessionCost"("userId", "sessionId");
CREATE INDEX IF NOT EXISTS "SessionCost_userId_idx" ON "SessionCost"("userId");
