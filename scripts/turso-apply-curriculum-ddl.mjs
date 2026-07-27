/**
 * Idempotent DDL for thinking-curriculum Phase 3 tables/columns on Turso.
 * Adds ConceptMastery spacing fields + TaskAttempt table. Safe to re-run.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url?.startsWith("libsql://")) {
  console.error("ABORT: TURSO_DATABASE_URL missing or not libsql://");
  process.exit(1);
}
if (!authToken) {
  console.error("ABORT: TURSO_AUTH_TOKEN missing.");
  process.exit(1);
}

const host = url.replace(/^libsql:\/\//, "").split("?")[0];
console.log(`[turso-curriculum-ddl] target: ${host}`);

const client = createClient({ url, authToken });

async function columnNames(table) {
  const res = await client.execute(`PRAGMA table_info("${table}")`);
  return new Set(res.rows.map((r) => r.name));
}

try {
  const masteryCols = await columnNames("ConceptMastery");
  if (!masteryCols.has("intervalStep")) {
    await client.execute(
      'ALTER TABLE "ConceptMastery" ADD COLUMN "intervalStep" INTEGER NOT NULL DEFAULT 0'
    );
    console.log("[turso-curriculum-ddl] added ConceptMastery.intervalStep");
  } else {
    console.log("[turso-curriculum-ddl] ConceptMastery.intervalStep already present");
  }

  if (!masteryCols.has("nextReviewAt")) {
    await client.execute('ALTER TABLE "ConceptMastery" ADD COLUMN "nextReviewAt" DATETIME');
    console.log("[turso-curriculum-ddl] added ConceptMastery.nextReviewAt");
  } else {
    console.log("[turso-curriculum-ddl] ConceptMastery.nextReviewAt already present");
  }

  const taskAttemptExists = (await columnNames("TaskAttempt")).size > 0;
  if (!taskAttemptExists) {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "TaskAttempt" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "concept" TEXT NOT NULL,
        "family" TEXT NOT NULL,
        "tier" INTEGER NOT NULL,
        "pass" BOOLEAN NOT NULL,
        "eventId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TaskAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await client.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS "TaskAttempt_eventId_key" ON "TaskAttempt"("eventId")'
    );
    await client.execute(
      'CREATE INDEX IF NOT EXISTS "TaskAttempt_userId_concept_idx" ON "TaskAttempt"("userId", "concept")'
    );
    console.log("[turso-curriculum-ddl] created TaskAttempt");
  } else {
    console.log("[turso-curriculum-ddl] TaskAttempt already present");
  }

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log(
    "[turso-curriculum-ddl] tables:",
    tables.rows.map((r) => r.name).join(", ")
  );
} catch (err) {
  console.error("[turso-curriculum-ddl] FAILED:", err?.message ?? err);
  process.exit(1);
} finally {
  client.close();
}
