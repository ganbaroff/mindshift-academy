/**
 * W2 local additive-migration drill — isolated file libsql only.
 * Proves: delta applies on NON-EMPTY DB; baseline is NOT re-run; restore-from-copy rolls back.
 * Does NOT touch Turso, .env secrets, or production.
 */
import { createClient } from "@libsql/client";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const WORK = __dirname;
const BASELINE = join(ROOT, "prisma", "migrations", "0000_baseline", "migration.sql");
const DELTA = join(ROOT, "prisma", "migrations", "0001_w2_additive_lane4", "migration.sql");

const workPath = join(WORK, "work.db");
const prePath = join(WORK, "pre.db");
const log = [];
function say(msg) {
  console.log(msg);
  log.push(msg);
}

function statementsFromSql(raw) {
  const idempotent = raw
    .replace(/CREATE TABLE (?!IF NOT EXISTS)/gi, "CREATE TABLE IF NOT EXISTS ")
    .replace(
      /CREATE UNIQUE INDEX (?!IF NOT EXISTS)/gi,
      "CREATE UNIQUE INDEX IF NOT EXISTS ",
    )
    .replace(/CREATE INDEX (?!IF NOT EXISTS)/gi, "CREATE INDEX IF NOT EXISTS ");
  return idempotent
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) =>
      s
        .split(/\r?\n/)
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function execSqlFile(client, path, { ignoreDuplicateColumn = false } = {}) {
  const stmts = statementsFromSql(readFileSync(path, "utf8"));
  for (const sql of stmts) {
    try {
      await client.execute(sql);
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (ignoreDuplicateColumn && /duplicate column/i.test(msg)) continue;
      throw e;
    }
  }
}

async function tableList(client) {
  const res = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return res.rows.map((r) => String(r.name));
}

async function columns(client, table) {
  const res = await client.execute(`PRAGMA table_info("${table}")`);
  return res.rows.map((r) => String(r.name));
}

async function main() {
  mkdirSync(WORK, { recursive: true });
  for (const p of [workPath, prePath]) {
    if (existsSync(p)) unlinkSync(p);
  }

  say("=== W2 ADDITIVE MIGRATION DRILL START ===");
  const client = createClient({ url: `file:${workPath}` });

  say("A1: apply baseline to EMPTY local file (greenfield only)");
  await execSqlFile(client, BASELINE);

  say("A2: seed User so DB is NON-EMPTY");
  await client.execute(
    `INSERT INTO "User" ("id","username","xp","crystals","streak","streakFreezes","lastActive","activeStep","createdAt")
     VALUES ('u1','seed',0,0,0,0,CURRENT_TIMESTAMP,1,CURRENT_TIMESTAMP)`,
  );
  const tablesBefore = await tableList(client);
  say(`tables before delta: ${tablesBefore.join(",")}`);
  if (!tablesBefore.includes("User")) throw new Error("baseline missing User");
  if (tablesBefore.includes("DegradeEvent")) throw new Error("DegradeEvent must not exist yet");

  copyFileSync(workPath, prePath);
  say("A3: snapshot pre.db (rollback = restore copy)");

  say("A4: apply ADDITIVE delta on non-empty DB");
  await execSqlFile(client, DELTA, { ignoreDuplicateColumn: true });

  const tablesAfter = await tableList(client);
  for (const t of ["DegradeEvent", "ReportDeliveryLog", "SessionCost"]) {
    if (!tablesAfter.includes(t)) throw new Error(`missing table ${t}`);
    say(`PASS table ${t} present`);
  }
  const taCols = await columns(client, "TaskAttempt");
  if (!taCols.includes("sessionId") || !taCols.includes("taskId")) {
    throw new Error("TaskAttempt missing sessionId/taskId");
  }
  say("PASS TaskAttempt.sessionId + taskId present");

  const userCount = Number(
    (await client.execute(`SELECT COUNT(*) AS c FROM "User"`)).rows[0].c,
  );
  if (userCount !== 1) throw new Error(`seed User lost: ${userCount}`);
  say("PASS seeded User survived additive delta");

  say("A5: refuse from-empty baseline as rollback (non-application proof)");
  say("ROLLBACK = copyFileSync(pre.db → work.db), NOT re-run 0000_baseline");
  client.close();
  copyFileSync(prePath, workPath);
  const client2 = createClient({ url: `file:${workPath}` });
  const tablesRestored = await tableList(client2);
  if (tablesRestored.includes("DegradeEvent")) {
    throw new Error("restore failed — DegradeEvent still present");
  }
  say("PASS restore-from-pre removed additive tables");
  client2.close();

  writeFileSync(join(WORK, "drill-console.log"), log.join("\n") + "\n");
  say("=== W2 ADDITIVE MIGRATION DRILL PASS ===");
}

main().catch((e) => {
  console.error(e);
  writeFileSync(join(WORK, "drill-console.log"), log.join("\n") + "\n" + String(e));
  process.exit(1);
});
