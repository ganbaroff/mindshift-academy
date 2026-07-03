// One-off helper: push the Prisma schema to the fresh Turso DB (NOT local file:./dev.db).
//
// Prisma 7.8's schema-engine cannot drive `libsql://` over `--url` (P1013) and this
// @prisma/config version exposes no `experimental.adapter` hook, so we use the
// Turso-documented workflow: generate DDL with `prisma migrate diff --from-empty`,
// then apply it to Turso through the SAME @libsql/client the app runtime uses.
//
// It reads TURSO_DATABASE_URL + TURSO_AUTH_TOKEN from .env and NEVER prints their
// values. Idempotent: every CREATE is rewritten to `IF NOT EXISTS`, so re-runs
// converge without error and touch no existing rows.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith("libsql://")) {
  console.error("ABORT: TURSO_DATABASE_URL missing or not a libsql:// URL. Refusing to target a non-Turso DB.");
  process.exit(1);
}
if (!authToken) {
  console.error("ABORT: TURSO_AUTH_TOKEN missing.");
  process.exit(1);
}

const host = url.replace(/^libsql:\/\//, "").split("?")[0];
console.log(`[turso-db-push] target host: ${host} (auth: present)`);

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("ABORT: pass the path to the DDL .sql file as argv[1].");
  process.exit(1);
}

// Make the DDL idempotent: CREATE TABLE/INDEX -> ... IF NOT EXISTS.
const raw = readFileSync(sqlPath, "utf8");
const idempotent = raw
  .replace(/CREATE TABLE (?!IF NOT EXISTS)/gi, "CREATE TABLE IF NOT EXISTS ")
  .replace(/CREATE UNIQUE INDEX (?!IF NOT EXISTS)/gi, "CREATE UNIQUE INDEX IF NOT EXISTS ")
  .replace(/CREATE INDEX (?!IF NOT EXISTS)/gi, "CREATE INDEX IF NOT EXISTS ");

// Split into individual statements (strip -- comments, split on ;).
const statements = idempotent
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.split(/\r?\n/).filter((l) => !l.trim().startsWith("--")).join("\n").trim())
  .filter((s) => s.length > 0);

const client = createClient({ url, authToken });

let applied = 0;
try {
  for (const stmt of statements) {
    await client.execute(stmt);
    applied++;
  }
  console.log(`[turso-db-push] applied ${applied} statement(s).`);

  // Verify: read the table list back from Turso.
  const res = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name"
  );
  const tables = res.rows.map((r) => r.name);
  console.log(`[turso-db-push] tables now on Turso: ${JSON.stringify(tables)}`);
} catch (err) {
  console.error("[turso-db-push] FAILED:", err?.message ?? err);
  process.exit(1);
} finally {
  client.close();
}
