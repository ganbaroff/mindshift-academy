// ADDITIVE push of the two consent tables to PROD Turso. Copies the exact CREATE DDL from
// dev.db (already built there), creates them on prod ONLY if absent. Never drops/alters the
// 6 existing tables, never touches a row of existing data. Creds read from .env (never printed).
import fs from "fs";
import { createClient } from "@libsql/client";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const prod = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const dev = createClient({ url: "file:./dev.db" });

const TARGET = ["ParentalConsent", "ConsentVerification"];
const existing = (await prod.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map((r) => r.name);
console.log("prod existing tables (untouched):", existing.join(", "));

const ddl = await dev.execute(
  "SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('ParentalConsent','ConsentVerification')"
);
for (const row of ddl.rows) {
  if (existing.includes(row.name)) { console.log("SKIP (exists):", row.name); continue; }
  await prod.execute(String(row.sql));
  console.log("CREATED table:", row.name);
}
const idx = await dev.execute(
  "SELECT name, sql, tbl_name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND tbl_name IN ('ParentalConsent','ConsentVerification')"
);
for (const row of idx.rows) {
  try { await prod.execute(String(row.sql)); console.log("CREATED index:", row.name, "on", row.tbl_name); }
  catch (e) { console.log("index skip:", row.name, "-", e.message); }
}
const now = (await prod.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('ParentalConsent','ConsentVerification')")).rows.map((r) => r.name);
console.log("VERIFY prod now has:", now.join(", ") || "(none)");
const after = (await prod.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map((r) => r.name);
console.log("prod total tables after:", after.length, "->", after.join(", "));
