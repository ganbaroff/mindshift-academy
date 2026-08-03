// Operator approval for one or more parent emails.
//
//   node scripts/approve-access-request.mjs parent@example.com
//   node scripts/approve-access-request.mjs parent@example.com --grant       # + vercel env add
//   node scripts/approve-access-request.mjs parent@example.com --issue-code  # + one-time code
//
// Default run is SAFE: it prints the allowlist variable name and marks the request approved.
// Nothing reaches Vercel or issues a credential unless the matching flag is passed, because
// `--grant` changes production configuration and `--issue-code` writes to the live database.
//
// The email is deliberately NOT re-checked against the allowlist: the operator typing it here
// IS the decision. Raw codes/links are printed once and are not recoverable afterwards.
import "dotenv/config";
import { register } from "node:module";
import { spawnSync } from "node:child_process";

register("./alias-loader.mjs", import.meta.url);
const { parentAllowEmailEnvKey, normalizeParentEmail } = await import("@/lib/parent-allowlist");

const args = process.argv.slice(2);
const doGrant = args.includes("--grant");
const doCode = args.includes("--issue-code");
const emails = args
  .filter((a) => !a.startsWith("--"))
  .map((e) => normalizeParentEmail(e))
  .filter(Boolean);

if (emails.length === 0) {
  console.error(
    "Usage: node scripts/approve-access-request.mjs parent@example.com [--grant] [--issue-code]"
  );
  process.exit(1);
}

const dbHost = (() => {
  try {
    return new URL(process.env.TURSO_DATABASE_URL ?? "file:./dev.db").host || "local sqlite";
  } catch {
    return "local sqlite";
  }
})();
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

console.log(`DB: ${dbHost}`);
console.log(`App: ${appUrl}`);
console.log(`Mode: ${doGrant ? "grant " : ""}${doCode ? "issue-code " : ""}${!doGrant && !doCode ? "dry (names only)" : ""}\n`);

const { prisma } = await import("@/lib/prisma");
const { createAccessCode } = doCode ? await import("@/lib/access-code") : { createAccessCode: null };

for (const email of emails) {
  const envKey = parentAllowEmailEnvKey(email);
  console.log(`EMAIL:     ${email}`);
  console.log(`ALLOWLIST: ${envKey}=1`);

  await prisma.accessRequest.upsert({
    where: { email },
    update: { status: "approved", decidedAt: new Date() },
    create: { email, source: "operator", status: "approved", decidedAt: new Date() },
  });
  console.log("REQUEST:   marked approved");

  if (doGrant) {
    // `vercel env add` reads the value from stdin, so the grant value never sits in argv.
    const res = spawnSync("npx", ["vercel", "env", "add", envKey, "production"], {
      input: "1\n",
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
    const already = /already exists/i.test(output);
    console.log(`VERCEL:    ${res.status === 0 ? "added" : already ? "already present" : "FAILED"}`);
    if (res.status !== 0 && !already) console.log(output.trim().split("\n").slice(-3).join("\n"));
  }

  if (doCode && createAccessCode) {
    const { code, activationToken } = await createAccessCode(email);
    console.log(`CODE:      ${code.slice(0, 4)} ${code.slice(4)}   (child types this)`);
    console.log(`ACTIVATE:  ${appUrl}/activate?t=${activationToken}   (parent opens once)`);
  }
  console.log("");
}

if (doGrant) {
  console.log("Reminder: a Vercel env change only applies to the NEXT production deployment.");
}
if (!doGrant) {
  console.log("Next: add the ALLOWLIST variable(s) above in Vercel (or re-run with --grant), then redeploy.");
}
if (!doCode) {
  console.log("Next: re-run with --issue-code to mint the family's code + activation link.");
}

process.exit(0);
