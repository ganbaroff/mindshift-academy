// Read-only: list tables on the PROD Turso DB using creds already in .env (never printed).
// Proves I already hold prod access; checks whether the consent tables need an additive push.
import fs from "fs";
import { createClient } from "@libsql/client";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const url = env.TURSO_DATABASE_URL;
if (!url || !url.startsWith("libsql://")) {
  console.log("No prod TURSO_DATABASE_URL — abort (not touching anything).");
  process.exit(0);
}
const c = createClient({ url, authToken: env.TURSO_AUTH_TOKEN });
const r = await c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
const names = r.rows.map((x) => x.name);
console.log("prod host:", url.replace(/libsql:\/\/([a-z-]{1,12}).*/, "libsql://$1…"));
console.log("prod tables:", names.join(", "));
console.log("ParentalConsent:", names.includes("ParentalConsent") ? "EXISTS" : "ABSENT (additive push needed)");
console.log("ConsentVerification:", names.includes("ConsentVerification") ? "EXISTS" : "ABSENT (additive push needed)");
