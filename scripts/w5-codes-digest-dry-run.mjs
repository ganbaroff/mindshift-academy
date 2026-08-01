/**
 * Dry-run: derive ACADEMY_ALLOW_EMAIL_* names for 10 placeholder pilot families.
 * Does NOT call createAccessCode, Vercel, or any remote DB.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/release/_w5_drill_workspace");
mkdirSync(outDir, { recursive: true });

const emails = Array.from({ length: 10 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `pilot-family-${n}@example.invalid`;
});

const lines = [
  "# W5 codes digest dry-run (placeholders only)",
  `Generated: ${new Date().toISOString()}`,
  "NO createAccessCode. NO vercel env. NO send.",
  "",
];

for (const email of emails) {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").toUpperCase();
  const varName = `ACADEMY_ALLOW_EMAIL_${digest}`;
  lines.push(`${email}`);
  lines.push(`  ${varName}`);
  lines.push(`  digest_prefix=${digest.slice(0, 12)}…`);
  lines.push("");
}

const path = join(outDir, "codes-digest-dry-run.txt");
writeFileSync(path, lines.join("\n"), "utf8");
console.log("Wrote", path);
console.log("families", emails.length);
