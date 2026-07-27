import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO env");
  process.exit(1);
}

const client = createClient({ url, authToken });
try {
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log("tables:", tables.rows.map((r) => r.name).join(", "));

  for (const name of ["ConceptMastery", "TaskAttempt", "User"]) {
    const cols = await client.execute(`PRAGMA table_info("${name}")`);
    if (cols.rows.length === 0) {
      console.log(`${name}: (missing)`);
    } else {
      console.log(`${name}:`, cols.rows.map((r) => r.name).join(", "));
    }
  }
} finally {
  client.close();
}
