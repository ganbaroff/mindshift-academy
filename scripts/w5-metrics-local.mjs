/**
 * W5 metrics pack — LOCAL sqlite ONLY (file:./dev.db).
 * Refuses Turso / remote URLs. Never prints child text columns (none selected).
 */
import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/release/_w5_drill_workspace");
mkdirSync(outDir, { recursive: true });

const LOCAL = "file:./dev.db";
if (process.env.W5_ALLOW_REMOTE_DB === "1") {
  console.error("Refusing: W5_ALLOW_REMOTE_DB must not be set for this drill.");
  process.exit(2);
}
if (process.env.TURSO_DATABASE_URL) {
  console.log("NOTE: ignoring TURSO_DATABASE_URL — forcing local file:./dev.db");
}

if (!existsSync(join(root, "dev.db")) && !existsSync(join(root, "prisma/dev.db"))) {
  console.error("No local dev.db found. Create/use file:./dev.db only.");
  process.exit(1);
}

const url = existsSync(join(root, "dev.db")) ? LOCAL : "file:./prisma/dev.db";
const client = createClient({ url });

const sqlPath = join(root, "docs/release/metrics/W5-OPERATOR-METRICS.sql");
const raw = readFileSync(sqlPath, "utf8");
const statements = raw
  .split(/;\s*\n/)
  .map((s) => s.replace(/^--.*$/gm, "").trim())
  .filter((s) => s.length > 10);

const lines = [
  `# W5 operator metrics — local sample`,
  `Generated: ${new Date().toISOString()}`,
  `DB: ${url} (LOCAL ONLY)`,
  ``,
];

let i = 0;
for (const stmt of statements) {
  i++;
  lines.push(`## Query ${i}`);
  lines.push("```sql");
  lines.push(stmt.slice(0, 400) + (stmt.length > 400 ? "\n-- …" : ""));
  lines.push("```");
  try {
    const rs = await client.execute(stmt);
    lines.push(`rows: ${rs.rows.length}`);
    const sample = rs.rows.slice(0, 8).map((r) => JSON.stringify(r));
    if (sample.length === 0) lines.push("(empty)");
    else lines.push(...sample.map((s) => `- ${s}`));
  } catch (err) {
    lines.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
  lines.push("");
}

const outPath = join(outDir, "metrics-local-sample.md");
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Wrote", outPath);
process.exit(0);
