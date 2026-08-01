import { readFileSync } from "node:fs";
import { join } from "node:path";

const CYR = /[\u0400-\u04FF]/;
const root = "src/app/api";
const must = [
  "access-code/redeem",
  "access-code/activate",
  "chat",
  "monster",
  "tts",
  "consent/verify",
  "consent/request-code",
  "consent/revoke",
  "consent/status",
  "learning/decide",
  "learning/outcome",
  "cron/mood-decay",
  "cron/weekly-report",
  "formulation/submit",
  "generate-silhouette",
  "reset",
  "user",
  "child-data",
];

const errors = readFileSync("src/lib/errors.ts", "utf8");
if (!CYR.test(errors)) throw new Error("errors.ts no Cyrillic");
console.log("errors.ts Cyrillic OK");
console.log("CALM_RETRY:", /CALM_RETRY\s*=\s*"([^"]+)"/.exec(errors)?.[1]);

let q = 0;
for (const rel of must) {
  const f = join(root, rel, "route.ts");
  const t = readFileSync(f, "utf8");
  if (/\?{3,}/.test(t)) {
    q++;
    console.error("??? still in", f);
  }
  if (!t.includes("@/lib/errors") && !t.includes("Errors.")) {
    // generate-silhouette / formulation may only use Errors once
  }
  if (t.includes("Errors.") && !CYR.test(errors)) throw new Error("bad");
  // Read-back: if file still has error: "human", must be Cyrillic or code
  const re = /[{,]\s*error:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(t))) {
    const lit = m[1];
    if (/\?{3,}/.test(lit)) throw new Error(`${f} ??? ${lit}`);
    if (/^[a-z0-9_]+$/i.test(lit)) continue;
    if (!CYR.test(lit)) console.warn("WARN non-cyrillic error literal", f, lit);
  }
  console.log("OK", rel, t.includes("Errors.") ? "via Errors" : "no Errors ref");
}
console.log("remaining ??? files:", q);
if (q) process.exit(1);
