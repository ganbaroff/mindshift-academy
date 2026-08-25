#!/usr/bin/env node
/**
 * An off-platform copy of the live database, and — the part that makes it a backup rather
 * than a file — a restore of that copy, verified row-count by row-count, in the same run.
 *
 * What was actually missing. Turso does back the database up: point-in-time recovery runs
 * automatically at COMMIT, with a 24-hour window on the free plan and 10/30/90 days on paid
 * ones. So the data is not unprotected. What did not exist was (a) any copy that survives the
 * account itself — a billing lapse, a mistaken database delete, a provider incident — and
 * (b) any evidence that a restore has ever been performed. An untested backup is a belief.
 *
 * This is deliberately NOT scheduled and NOT wired into CI: it writes the personal data of
 * children — parental consent records, task attempts, monster names — to a local file. That
 * file is a COPPA-relevant artefact. It belongs on an operator's machine, made knowingly, and
 * deleted when it has served its purpose. Automating it would scatter copies nobody tracks.
 *
 *   node scripts/turso-export.mjs
 *
 * Refuses to write anywhere git would track, so a dump can never be committed by accident.
 * Prints table names, row counts, the output path and its size — never a row, never a value
 * from the configuration file.
 *
 * Exit codes: 0 = dumped AND restored with matching counts · 1 = restore mismatch (the dump
 * is not trustworthy, say so out loud) · 2 = could not connect or the target is unsafe.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient } from "@libsql/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "backups");

/** Two values, loaded in-process. Never printed — see turso-schema-snapshot.mjs for why. */
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

/**
 * Refuse to write children's data anywhere git would pick it up. Checked against the real
 * ignore rules rather than against a hopeful path convention, because "I thought it was
 * ignored" is how personal data reaches a public repository exactly once.
 */
function refuseIfTracked() {
  const ignore = existsSync(join(root, ".gitignore"))
    ? readFileSync(join(root, ".gitignore"), "utf8")
    : "";
  const covered = /^\/?backups\/?\s*$/m.test(ignore);
  if (!covered) {
    console.error("BLOCKED: `backups/` is not in .gitignore.");
    console.error("This file would contain children's personal data. Add `/backups/` first.");
    process.exit(2);
  }
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return String(value);
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    const bytes = Buffer.from(value instanceof ArrayBuffer ? value : value.buffer);
    return `X'${bytes.toString("hex")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

const env = loadLocalEnv(["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"]);
const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("BLOCKED: TURSO_DATABASE_URL is set neither in the environment nor locally.");
  process.exit(2);
}

refuseIfTracked();

const scheme = url.split(":")[0];
console.log(`target scheme: ${scheme}`);
console.log(`auth token supplied: ${authToken ? "yes" : "no"}`);

const client = createClient(authToken ? { url, authToken } : { url });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = join(OUT_DIR, `turso-${stamp}.sql`);

try {
  const objects = await client.execute(
    `SELECT type, name, sql FROM sqlite_master
      WHERE sql IS NOT NULL
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_litestream%'
      ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name`
  );

  const lines = [
    "-- MindShift Academy — logical export of the live database.",
    "-- Contains children's personal data. Handle as a COPPA artefact; delete when done.",
    "PRAGMA foreign_keys=OFF;",
    "BEGIN TRANSACTION;",
  ];
  const sourceCounts = new Map();

  for (const object of objects.rows) {
    lines.push(`${object.sql};`);
    if (object.type !== "table") continue;

    const table = String(object.name);
    const rows = await client.execute(`SELECT * FROM "${table}"`);
    sourceCounts.set(table, rows.rows.length);
    for (const row of rows.rows) {
      const columns = rows.columns.map((column) => `"${column}"`).join(", ");
      const values = rows.columns.map((column) => sqlLiteral(row[column])).join(", ");
      lines.push(`INSERT INTO "${table}" (${columns}) VALUES (${values});`);
    }
  }

  lines.push("COMMIT;", "PRAGMA foreign_keys=ON;", "");

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outFile, lines.join("\n"), "utf8");

  console.log(`\nexported ${sourceCounts.size} tables to ${outFile}`);
  console.log(`size: ${statSync(outFile).size} bytes`);
  for (const [table, count] of [...sourceCounts].sort()) console.log(`  ${table}  rows=${count}`);

  // The restore. A dump nobody has ever loaded is a belief, not a backup.
  const probeFile = join(OUT_DIR, `.restore-probe-${stamp}.db`);
  let mismatches = 0;
  try {
    const probe = new DatabaseSync(probeFile);
    probe.exec(readFileSync(outFile, "utf8"));
    console.log("\nrestore probe: dump loaded into a fresh database");
    for (const [table, expected] of [...sourceCounts].sort()) {
      const actual = probe.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get().n;
      const ok = Number(actual) === Number(expected);
      if (!ok) mismatches += 1;
      console.log(`  ${ok ? "MATCH" : "MISMATCH"}  ${table}  source=${expected} restored=${actual}`);
    }
    probe.close();
  } finally {
    rmSync(probeFile, { force: true });
  }

  if (mismatches) {
    console.error(`\n${mismatches} table(s) did not restore to the same row count. Do NOT rely on this dump.`);
    process.exit(1);
  }
  console.log("\nVERIFIED: every table restored to the same row count it was exported with.");
  process.exit(0);
} catch (error) {
  console.error(`FAILED: ${error?.constructor?.name ?? "Error"}`);
  console.error(String(error?.message ?? "").slice(0, 120).replace(/https?:\/\/\S+|libsql:\/\/\S+/g, "<redacted>"));
  process.exit(2);
} finally {
  client.close();
}
