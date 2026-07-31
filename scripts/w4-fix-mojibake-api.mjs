/**
 * W4-FIX: repair corrupted ASCII-? Russian API error strings via Errors catalog.
 * Writes UTF-8 only — never use PowerShell Set-Content for Cyrillic.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = join(root, "src", "app", "api");
const CYRILLIC = /[\u0400-\u04FF]/;

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name === "route.ts") acc.push(p);
  }
  return acc;
}

/** Count user-facing JSON error string literals that contain ??? runs. */
function countCorruptedErrorLiterals(text) {
  let n = 0;
  const re = /[{,]\s*error:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text))) {
    if (/\?{3,}/.test(m[1])) n++;
  }
  return n;
}

function ensureErrorsImport(src) {
  if (src.includes('from "@/lib/errors"') || src.includes("from '@/lib/errors'")) return src;
  const lines = src.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) lastImport = i;
  }
  const inj = 'import { Errors } from "@/lib/errors";';
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, inj);
    return lines.join("\n");
  }
  return inj + "\n" + src;
}

function repair(src) {
  let out = src;
  const reps = [
    ['"????????? ???? ? ???????."', "Errors.unauthorized"],
    ['"?????? ???????? ??????????."', "Errors.unavailable"],
    ['"??????? ????? ????????, ??????? ???????."', "Errors.rateLimited"],
    ['"???????? ??????."', "Errors.badRequest"],
    ['"???-?? ????? ?? ???. ???????? ??? ???!"', "Errors.calmRetry"],
    ['"???????? ????? ??????????."', "Errors.bypassUnavailable"],
    ['"??? ???????? ??? ??????."', "Errors.noConsentToRevoke"],
    // leftover English in the same API surfaces
    ['"Failed to delete Academy data"', "Errors.calmRetry"],
    ['"Email required"', "Errors.badRequest"],
    ['"Weekly-report email configuration is incomplete"', "Errors.unavailable"],
    ['"Weekly report CRON failed"', "Errors.calmRetry"],
    ['"Mood decay CRON failed"', "Errors.calmRetry"],
    ['"Test bypass unavailable."', "Errors.bypassUnavailable"],
  ];
  for (const [from, to] of reps) {
    out = out.split(from).join(to);
  }
  if (out !== src) out = ensureErrorsImport(out);
  return out;
}

function assertClean(src, file) {
  const left = countCorruptedErrorLiterals(src);
  if (left) throw new Error(`Still ${left} corrupted error literals in ${file}`);
  if (src.includes("Errors.") && !src.includes("@/lib/errors")) {
    throw new Error(`Missing Errors import in ${file}`);
  }
  // Prove remaining JSON error: "..." literals contain Cyrillic (not ???)
  const re = /[{,]\s*error:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src))) {
    const lit = m[1];
    if (/\?{3,}/.test(lit)) throw new Error(`??? in ${file}: ${lit}`);
  }
}

const files = walk(apiRoot);
let before = 0;
const touched = [];
for (const f of files) {
  const beforeText = readFileSync(f, "utf8");
  const c = countCorruptedErrorLiterals(beforeText);
  before += c;
}

for (const f of files) {
  const beforeText = readFileSync(f, "utf8");
  const c = countCorruptedErrorLiterals(beforeText);
  if (!c) continue;
  const afterText = repair(beforeText);
  writeFileSync(f, afterText, "utf8");
  const readBack = readFileSync(f, "utf8");
  assertClean(readBack, f);
  touched.push({
    file: f.slice(root.length + 1).replace(/\\/g, "/"),
    before: c,
    after: countCorruptedErrorLiterals(readBack),
  });
}

let after = 0;
for (const f of files) {
  after += countCorruptedErrorLiterals(readFileSync(f, "utf8"));
}

const errorsTs = readFileSync(join(root, "src/lib/errors.ts"), "utf8");
if (!CYRILLIC.test(errorsTs)) throw new Error("errors.ts lost Cyrillic");
for (const key of [
  "unauthorized",
  "unavailable",
  "rateLimited",
  "badRequest",
  "calmRetry",
  "bypassUnavailable",
  "noConsentToRevoke",
]) {
  if (!errorsTs.includes(key)) throw new Error(`errors.ts missing ${key}`);
}

console.log(JSON.stringify({ beforeTotal: before, afterTotal: after, filesTouched: touched.length, touched }, null, 2));
