-- W3 additive-only: certificate + formulation metadata + optional display label.
-- NEVER DROP / NEVER rewrite existing Inventory rows (grandfather rule).
-- Historical baseline 0000 must NEVER be applied to a non-empty database.

ALTER TABLE "User" ADD COLUMN "certificateDisplayLabel" TEXT;

CREATE TABLE IF NOT EXISTS "FormulationSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contentVersion" TEXT NOT NULL,
    "dayBucket" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormulationSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FormulationSubmission_userId_sessionId_key" ON "FormulationSubmission"("userId", "sessionId");
CREATE INDEX IF NOT EXISTS "FormulationSubmission_userId_idx" ON "FormulationSubmission"("userId");

CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recipientLabel" TEXT NOT NULL,
    "formulationVersion" TEXT NOT NULL,
    "formulationDayBucket" TEXT NOT NULL,
    "issuedDayBucket" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_userId_key" ON "Certificate"("userId");
