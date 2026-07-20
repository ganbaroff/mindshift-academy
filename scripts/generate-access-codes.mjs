// Admin CLI: generate one-time child-access codes for allowlisted parent emails.
//   node scripts/generate-access-codes.mjs parent1@example.com parent2@example.com
// Prints the raw CODE (child types this) + the ACTIVATE link (parent opens once) ONCE — they are
// not recoverable later (only hashes are stored). Operator hands both to the invited parent.
// Emails not in ALLOWLIST_EMAILS are skipped.
import "dotenv/config";
import { createAccessCode } from "../src/lib/access-code.ts";
import { isEmailAllowed } from "../src/lib/access.ts";

const emails = process.argv
  .slice(2)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (emails.length === 0) {
  console.error("Usage: node scripts/generate-access-codes.mjs parent@example.com [more@example.com ...]");
  process.exit(1);
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

for (const email of emails) {
  if (!isEmailAllowed(email)) {
    console.log(`SKIP  ${email} — not in ALLOWLIST_EMAILS`);
    continue;
  }
  const { code, activationToken } = await createAccessCode(email);
  console.log(`\nEMAIL:     ${email}`);
  console.log(`CODE:      ${code.slice(0, 4)} ${code.slice(4)}   (child types this)`);
  console.log(`ACTIVATE:  ${appUrl}/activate?t=${activationToken}   (parent opens once)`);
}

console.log("\nDone. Codes/links shown ONCE — only hashes are stored.");
process.exit(0);
