// Local preview launcher: runs `next dev` against a THROWAWAY local SQLite file instead of the
// production Turso database, so clicking through a form never writes to real family data.
// Shell-set variables take precedence over .env in Next, which is what pins the DB here.
//   node scripts/dev-preview.mjs [port]
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = process.argv[2] || "3007";
const dbFile = "preview.db";

process.env.TURSO_DATABASE_URL = `file:./${dbFile}`;
process.env.TURSO_AUTH_TOKEN = "";
process.env.NEXT_PUBLIC_APP_URL = `http://localhost:${port}`;
// Local limiter too: sharing the production Upstash buckets means a few clicks in a preview
// eat the real hourly allowance (and make the next preview run start throttled).
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";

// Only the tables a signed-out preview needs; the rest of the app is Clerk-gated.
const client = createClient({ url: `file:${join(root, dbFile)}` });
const sql = readFileSync(join(root, "prisma/migrations/0003_w6_access_request/migration.sql"), "utf8")
  .split("\n")
  .filter((line) => !line.trim().startsWith("--")) // drop comments first: they ride along with the next statement
  .join("\n");
for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
  await client.execute(statement);
}
console.log(`[dev-preview] local DB ready: ${dbFile}`);

spawn(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
