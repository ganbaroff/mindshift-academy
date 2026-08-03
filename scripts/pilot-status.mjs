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

  console.log("\ninbound requests:");
  for (const row of await q(`SELECT status, COUNT(*) AS n FROM AccessRequest GROUP BY status`)) {
    console.log(`  ${row.status ?? row.error}: ${row.n ?? ""}`);
  }
} finally {
  client.close();
}
