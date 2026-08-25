#!/usr/bin/env node
/**
 * Read-only receipt: what the LIVE database actually contains, and whether it still matches
 * `prisma/schema.prisma`.
 *
 * Why this exists. Every wave receipt from W0 to W5 carried the same line — the production
 * Turso schema state is UNKNOWN — and it stayed unknown because there was no cheap way to
 * ask. Migrations here are applied by hand (`scripts/turso-db-push.mjs`); nothing in CI or in
 * the Vercel build ever runs `prisma migrate deploy`, so drift between the checked-in schema
 * and the live database is possible and, until now, invisible. A deploy discovers it by
 * failing on a column that does not exist, in front of a child.
 *
 * Why it reuses the runtime's own client rather than Prisma's schema engine: that engine
 * cannot drive `libsql://` (P1013) — the same limitation `scripts/turso-db-push.mjs` documents
 * and works around the same way.
 *
 * Reads nothing but structure: table names, column names and row COUNTS. No row is ever
 * fetched, so no child's data is read, printed or written to disk. Credentials are consumed
 * by the process and never echoed — the output states the URL *scheme* and whether an auth
 * token was supplied, and nothing more.
 *
 * Usage — the local env file is loaded by this script, so no value passes through a shell,
 * a command line, or a process listing:
 *
 *   node scripts/turso-schema-snapshot.mjs
 *
 * Exit codes: 0 = live database matches the checked-in models · 1 = drift, listed · 2 = could
 * not connect or was pointed at nothing.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@libsql/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Load the two variables this script needs out of the local env file, in-process.
 *
 * Deliberately not `--env-file` on the command line: a path on a command line ends up in
 * shell history and in `ps` output, and it teaches the next person to type the name of a
 * credential file into a terminal. Nothing read here is ever printed — the two values go
 * straight into the client and the report speaks only in schemes and booleans.
 */
function loadLocalEnv(names) {
  const out = {};
  for (const name of names) if (process.env[name]) out[name] = process.env[name];
  const file = join(root, ".env");
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!names.includes(key) || out[key]) continue;
    out[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadLocalEnv(["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"]);
const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("BLOCKED: TURSO_DATABASE_URL is set neither in the environment nor in .env.");
  console.error("Nothing to inspect — this says nothing about the live schema.");
  process.exit(2);
}

const scheme = url.split(":")[0];
console.log(`target scheme: ${scheme}`);
console.log(`auth token supplied: ${authToken ? "yes" : "no"}`);
if (scheme === "file") {
  console.log("NOTE  this is a local file database, NOT production. The receipt below says");
  console.log("      nothing about the live Turso schema.");
}

/** Model names in prisma/schema.prisma, honouring @@map when a model renames its table. */
function modelsFromSchema() {
  const text = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
  const models = [];
  const modelPattern = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = modelPattern.exec(text))) {
    const [, name, body] = match;
    const mapped = body.match(/@@map\("([^"]+)"\)/);
    models.push(mapped ? mapped[1] : name);
  }
  return models.sort();
}

const client = createClient(authToken ? { url, authToken } : { url });

try {
  const tables = await client.execute(
    // `_litestream%` is Turso's own replication bookkeeping, not application schema — the same
    // filter turso-db-push.mjs applies when it lists tables back after a push.
    `SELECT name FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_litestream%'
      ORDER BY name`
  );
  const live = tables.rows.map((row) => String(row.name)).sort();

  console.log(`\nlive tables (${live.length}):`);
  for (const table of live) {
    const columns = await client.execute(`PRAGMA table_info("${table}")`);
    const count = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
    const names = columns.rows.map((row) => String(row.name)).join(", ");
    console.log(`  ${table}  rows=${count.rows[0].n}`);
    console.log(`    ${names}`);
  }

  const expected = modelsFromSchema();
  const missing = expected.filter((name) => !live.includes(name));
  const extra = live.filter((name) => !expected.includes(name) && name !== "_prisma_migrations");

  console.log(`\nchecked-in models (${expected.length}): ${expected.join(", ")}`);

  if (!missing.length && !extra.length) {
    console.log("\nPARITY: every checked-in model exists in the live database.");
    process.exit(0);
  }

  if (missing.length) console.log(`\nDRIFT — in prisma/schema.prisma but NOT live: ${missing.join(", ")}`);
  if (extra.length) console.log(`DRIFT — live but not in prisma/schema.prisma: ${extra.join(", ")}`);
  console.log("\nA deploy that touches a missing table fails in front of a child. Reconcile with");
  console.log("scripts/turso-db-push.mjs before shipping anything that reads it.");
  process.exit(1);
} catch (error) {
  // Never surface the raw error: libSQL adapter errors can carry the connection URL.
  console.error(`FAILED to inspect the database: ${error?.constructor?.name ?? "Error"}`);
  console.error(`message class: ${String(error?.message ?? "").slice(0, 80).replace(/https?:\/\/\S+|libsql:\/\/\S+/g, "<redacted>")}`);
  process.exit(2);
} finally {
  client.close();
}
