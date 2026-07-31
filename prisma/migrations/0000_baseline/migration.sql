-- =============================================================================
-- IMMUTABLE HISTORICAL SNAPSHOT — DO NOT APPLY TO A NON-EMPTY DATABASE
-- Generated: 2026-07-31 via prisma migrate diff --from-empty --to-schema
-- Authority: docs/handoffs/CURSOR-MINDSHIFT-V1-IMPLEMENTATION.md Section 3A.1
-- Rollback != re-run this file. Rollback = restore from backup / reverse delta.
-- See README.md in this folder.
-- =============================================================================
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkId" TEXT,
    "username" TEXT NOT NULL DEFAULT 'Uchenik',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "crystals" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "streakFreezes" INTEGER NOT NULL DEFAULT 0,
    "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeStep" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "promptUsed" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "mood" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Monster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "crystalRwd" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentalConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkId" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'email-plus',
    "serviceConsent" BOOLEAN NOT NULL DEFAULT false,
    "externalAiConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "verifiedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConsentVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkId" TEXT NOT NULL,
    "parentEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RewardEvent" (
    "eventId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stepId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConceptMastery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "mastery" REAL NOT NULL DEFAULT 0,
    "intervalStep" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ConceptMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "pass" BOOLEAN NOT NULL,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AtlasLearningSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "decisionId" TEXT,
    "goalId" TEXT,
    "decisionScore" REAL,
    "action" TEXT,
    "lessonFormat" TEXT,
    "masteryBefore" REAL NOT NULL,
    "masteryAfter" REAL,
    "decideReceiptJson" TEXT,
    "outcomeReceiptJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "AtlasLearningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "issuedForEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "clerkId" TEXT,
    "activationTokenHash" TEXT NOT NULL,
    "activationSalt" TEXT NOT NULL,
    "serviceConsent" BOOLEAN NOT NULL DEFAULT false,
    "externalAiConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentIp" TEXT,
    "activatedAt" DATETIME,
    "redeemedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Monster_userId_key" ON "Monster"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_userId_itemId_key" ON "Inventory"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_order_key" ON "Lesson"("order");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentalConsent_clerkId_key" ON "ParentalConsent"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentVerification_clerkId_key" ON "ConsentVerification"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptMastery_userId_concept_key" ON "ConceptMastery"("userId", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAttempt_eventId_key" ON "TaskAttempt"("eventId");

-- CreateIndex
CREATE INDEX "TaskAttempt_userId_concept_idx" ON "TaskAttempt"("userId", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "AtlasLearningSession_idempotencyKey_key" ON "AtlasLearningSession"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AccessCode_codeHash_key" ON "AccessCode"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "AccessCode_activationTokenHash_key" ON "AccessCode"("activationTokenHash");
