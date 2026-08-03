// Operator inbox: show pilot-access requests submitted from the site.
//   node scripts/list-access-requests.mjs            # only undecided ("new")
//   node scripts/list-access-requests.mjs --all      # every row
// Reads only. Prints the parent address (the operator needs it) and never any secret.
import "dotenv/config";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
const { prisma } = await import("@/lib/prisma");

const all = process.argv.includes("--all");
const dbHost = (() => {
  try {
    return new URL(process.env.TURSO_DATABASE_URL ?? "file:./dev.db").host || "local sqlite";
  } catch {
    return "local sqlite";
  }
})();

const rows = await prisma.accessRequest.findMany({
  where: all ? {} : { status: "new" },
  orderBy: { createdAt: "asc" },
});

console.log(`DB: ${dbHost}`);
console.log(`${rows.length} ${all ? "request(s)" : "undecided request(s)"}\n`);

for (const row of rows) {
  const when = row.createdAt.toISOString().slice(0, 16).replace("T", " ");
  console.log(`[${row.status}] ${row.email}`);
  console.log(`    submitted: ${when} UTC${row.notifiedAt ? " · alerted" : " · no alert sent"}`);
  if (row.parentName) console.log(`    name:      ${row.parentName}`);
  if (row.note) console.log(`    note:      ${row.note}`);
  console.log(`    approve:   node scripts/approve-access-request.mjs ${row.email}`);
  console.log("");
}

process.exit(0);
