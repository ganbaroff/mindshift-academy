/**
 * W0 local rollback/restore drill — isolated file: libsql only.
 * Does NOT touch Turso, .env secrets, or production.
 *
 * Proves: rollback = restore-from-file-copy, NOT re-run of 0000_baseline.
 */
import { createClient } from "@libsql/client";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const WORK = __dirname;
const BASELINE = join(
  ROOT,
  "prisma",
  "migrations",
  "0000_baseline",
  "migration.sql",
);

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

async function tableList(client) {
  const res = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return res.rows.map((r) => String(r.name));
}

async function userCount(client) {
  const res = await client.execute("SELECT COUNT(*) AS c FROM User");
  return Number(res.rows[0].c);
}

async function main() {
  mkdirSync(WORK, { recursive: true });
  for (const p of [workPath, prePath]) {
    if (existsSync(p)) {
      // recreate empty
      writeFileSync(p, "");
    }
  }

  say("=== W0 ROLLBACK DRILL START ===");
  say(`work.db: ${workPath}`);
  say(`pre.db:  ${prePath}`);
  say(`baseline path (NOT used as rollback): ${BASELINE}`);

  // --- Phase A: apply baseline ONLY to empty work.db ---
  const workUrl = `file:${workPath}`;
  let client = createClient({ url: workUrl });
  const tablesBefore = await tableList(client);
  say(`A1 empty tables: ${JSON.stringify(tablesBefore)}`);
  if (tablesBefore.length !== 0) {
    throw new Error("ABORT: work.db not empty before baseline — refuse apply");
  }

  const ddl = readFileSync(BASELINE, "utf8");
  const stmts = statementsFromSql(ddl);
  for (const stmt of stmts) {
    await client.execute(stmt);
  }
  const tablesAfterCreate = await tableList(client);
  say(
    `A2 after baseline on EMPTY: ${tablesAfterCreate.length} tables: ${JSON.stringify(tablesAfterCreate)}`,
  );

  // Seed deterministic rows
  await client.execute({
    sql: `INSERT INTO User (id, clerkId, username, xp, crystals, streak, streakFreezes, lastActive, activeStep, createdAt)
          VALUES (?, ?, ?, 10, 5, 0, 0, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)`,
    args: ["user-drill-1", "clerk_drill_1", "DrillChild"],
  });
  await client.execute({
    sql: `INSERT INTO AccessCode (
            id, codeHash, salt, issuedForEmail, status,
            activationTokenHash, activationSalt, expiresAt, createdAt
          ) VALUES (?, ?, ?, ?, 'issued', ?, ?, datetime('now','+7 days'), CURRENT_TIMESTAMP)`,
    args: [
      "code-drill-1",
      "hash_drill_code",
      "salt_drill",
      "parent-drill@example.test",
      "hash_drill_activation",
      "salt_activation",
    ],
  });
  const seededUsers = await userCount(client);
  const codeCount = await client.execute("SELECT COUNT(*) AS c FROM AccessCode");
  say(`A3 seeded User count=${seededUsers}; AccessCode count=${codeCount.rows[0].c}`);
  client.close();

  // Snapshot = rollback source
  copyFileSync(workPath, prePath);
  say(`A4 snapshot pre.db written (bytes=${readFileSync(prePath).length})`);

  // --- Phase B: prove baseline MUST NOT be applied to non-empty ---
  client = createClient({ url: workUrl });
  const nonEmptyTables = await tableList(client);
  say(
    `B1 non-empty proof: tables=${nonEmptyTables.length}, users=${await userCount(client)}`,
  );
  say(
    "B2 EXPLICIT NON-APPLICATION: refusing to re-run 0000_baseline against non-empty work.db (Section 3A.1).",
  );
  // Mutate instead: delete seed user + insert decoy (damage to restore)
  await client.execute("DELETE FROM User WHERE id = 'user-drill-1'");
  await client.execute({
    sql: `INSERT INTO User (id, clerkId, username, xp, crystals, streak, streakFreezes, lastActive, activeStep, createdAt)
          VALUES (?, ?, ?, 999, 999, 0, 0, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP)`,
    args: ["user-drill-DAMAGED", "clerk_damaged", "Damaged"],
  });
  say(
    `B3 after intentional damage: User count=${await userCount(client)}, ids=`,
  );
  const damaged = await client.execute("SELECT id, username, xp FROM User");
  for (const row of damaged.rows) {
    say(`    ${row.id} | ${row.username} | xp=${row.xp}`);
  }
  client.close();

  // --- Phase C: restore from pre.db copy (true rollback) ---
  copyFileSync(prePath, workPath);
  say("C1 restored work.db FROM pre.db file copy (this IS the rollback)");
  client = createClient({ url: workUrl });
  const restoredUsers = await userCount(client);
  const restoredRows = await client.execute(
    "SELECT id, username, xp FROM User ORDER BY id",
  );
  say(`C2 after restore: User count=${restoredUsers}`);
  for (const row of restoredRows.rows) {
    say(`    ${row.id} | ${row.username} | xp=${row.xp}`);
  }

  const ok =
    restoredUsers === 1 &&
    String(restoredRows.rows[0].id) === "user-drill-1" &&
    Number(restoredRows.rows[0].xp) === 10;
  if (!ok) throw new Error("RESTORE FAILED — state does not match snapshot");
  say("C3 PASS: restore matched pre-damage snapshot");
  say(
    "C4 PASS: rollback mechanism = file copy restore, NOT CREATE-from-empty baseline re-run",
  );
  client.close();

  say("=== W0 ROLLBACK DRILL PASS ===");
  writeFileSync(join(WORK, "drill-console.log"), log.join("\n") + "\n", "utf8");
}

main().catch((err) => {
  console.error("DRILL FAILED:", err?.message ?? err);
  process.exit(1);
});
