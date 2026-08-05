// Operator dashboard: one read-only look at the live pilot.
//   node scripts/pilot-status.mjs
// SELECTs only — never writes. Prints no raw code, no token, no child text (none is stored).
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("Missing TURSO_DATABASE_URL — nothing to inspect.");
  process.exit(1);
}

const client = createClient({ url, authToken });
const q = async (sql) => {
  try {
    return (await client.execute(sql)).rows;
  } catch (error) {
    return [{ error: String(error.message ?? error).slice(0, 120) }];
  }
};

try {
  console.log(`DB: ${new URL(url).host || url}\n`);

  console.log("access codes by status:");
  for (const row of await q(`SELECT status, COUNT(*) AS n FROM AccessCode GROUP BY status`)) {
    console.log(`  ${row.status ?? row.error}: ${row.n ?? ""}`);
  }
  for (const row of await q(
    `SELECT COUNT(*) AS n FROM AccessCode WHERE expiresAt < datetime('now')`
  )) {
    console.log(`  expired: ${row.n ?? row.error}`);
  }

  console.log("\nfamilies:");
  for (const [label, sql] of [
    ["accounts", `SELECT COUNT(*) AS n FROM User`],
    ["hatched pets", `SELECT COUNT(*) AS n FROM Monster`],
    ["valid consents", `SELECT COUNT(*) AS n FROM ParentalConsent WHERE verifiedAt IS NOT NULL AND revokedAt IS NULL`],
    ["task attempts", `SELECT COUNT(*) AS n FROM TaskAttempt`],
    ["certificates", `SELECT COUNT(*) AS n FROM Certificate`],
    ["degrade events", `SELECT COUNT(*) AS n FROM DegradeEvent`],
  ]) {
    const [row] = await q(sql);
    console.log(`  ${label}: ${row?.n ?? row?.error}`);
  }

  // Per-family detail: the operator's real question is "who is actually doing lessons",
  // which the aggregate counts above cannot answer. One row per issued access code.
  console.log("\nper family (code -> child progress):");
  const families = await q(`
    SELECT c.issuedForEmail AS email, c.status, c.createdAt, c.activatedAt, c.redeemedAt,
           u.id AS userId, u.username, u.xp, u.activeStep, u.lastActive,
           (SELECT COUNT(*) FROM TaskAttempt t WHERE t.userId = u.id) AS attempts,
           (SELECT COUNT(*) FROM TaskAttempt t WHERE t.userId = u.id AND t.pass = 1) AS passed
    FROM AccessCode c
    LEFT JOIN User u ON u.clerkId = c.clerkId
    ORDER BY c.createdAt DESC
  `);
  const day = (v) => (v ? String(v).slice(0, 16) : "—");
  for (const f of families) {
    if (f.error) {
      console.log(`  ${f.error}`);
      continue;
    }
    const entered = f.redeemedAt ? "вошли" : f.activatedAt ? "активировали, ребёнок не заходил" : "ещё не открывали письмо";
    console.log(`  ${f.email}`);
    console.log(`    код: ${f.status} · выдан ${day(f.createdAt)} · ${entered}`);
    if (f.userId) {
      console.log(
        `    ребёнок: ${f.username ?? "?"} · шаг ${f.activeStep ?? "?"} · ${f.xp ?? 0} XP · ` +
          `задач ${f.passed ?? 0}/${f.attempts ?? 0} · был ${day(f.lastActive)}`
      );
    }
  }

  console.log("\ninbound requests:");
  for (const row of await q(`SELECT status, COUNT(*) AS n FROM AccessRequest GROUP BY status`)) {
    console.log(`  ${row.status ?? row.error}: ${row.n ?? ""}`);
  }
  for (const row of await q(
    `SELECT email, status, createdAt FROM AccessRequest ORDER BY createdAt DESC LIMIT 20`
  )) {
    if (row.error) console.log(`  ${row.error}`);
    else console.log(`  ${row.status}  ${row.email}  ${day(row.createdAt)}`);
  }
} finally {
  client.close();
}
