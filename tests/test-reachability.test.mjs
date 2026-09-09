#!/usr/bin/env node
/**
 * Every test must be reachable from a gate that actually runs.
 *
 * The defect this exists for, caught by review on 2026-09-08: tests/dual-children.test.mjs held
 * a real invariant, was in neither `npm test` nor `verify:release` nor the CI workflow, and a
 * commit message claimed it "fails the build". A test outside every gate is decoration, and
 * nothing in the repository could tell the difference.
 *
 * Reachable means: named directly in the `test` chain, or in `verify:release`, or in
 * .github/workflows/*.yml — including indirectly, through an `npm run test:x` that those invoke.
 *
 * A file that is genuinely not meant to run in a gate (needs a live key, a paid provider, a
 * device) belongs in UNREACHED with a reason. The list may only shrink, and a file that has since
 * become reachable fails the run until it is removed from the list — the same two-sided ratchet
 * as tests/curriculum-variety.test.mjs and tests/design-tokens.test.mjs.
 *
 * No network, no browser, no database.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let failed = 0;
const fail = (l) => { failed += 1; console.log(`  FAIL  ${l}`); };
const pass = (l) => console.log(`  PASS  ${l}`);

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const scripts = pkg.scripts ?? {};

/** Text of every gate: npm test, verify:release, and every CI workflow file. */
let gateText = `${scripts.test ?? ""}\n${scripts["verify:release"] ?? ""}\n`;
const wfDir = join(ROOT, ".github", "workflows");
if (existsSync(wfDir)) {
  for (const f of readdirSync(wfDir)) gateText += readFileSync(join(wfDir, f), "utf8") + "\n";
}

/** Follow `npm run x` / `npm x` referenced by a gate, repeatedly, so indirection counts. */
let grew = true;
const pulled = new Set();
while (grew) {
  grew = false;
  for (const name of Object.keys(scripts)) {
    if (pulled.has(name)) continue;
    // Literal scan, not a regex: this file is written through shells that eat backslashes,
    // and a silently broken pattern here would make every test look reachable.
    const boundary = /[\w:-]/;
    const hit = [`npm run ${name}`, `npm ${name}`].some((needle) => {
      let at = gateText.indexOf(needle);
      while (at !== -1) {
        const after = gateText[at + needle.length] ?? " ";
        if (!boundary.test(after)) return true;
        at = gateText.indexOf(needle, at + 1);
      }
      return false;
    });
    if (hit) {
      pulled.add(name);
      gateText += "\n" + scripts[name];
      grew = true;
    }
  }
}

/**
 * A gate may call a wrapper script rather than the test file itself
 * (scripts/run-structured-attempt-contract.mjs runs tests/structured-attempt-route.test.mjs).
 * Pull the contents of every scripts/*.mjs the gates reference, so that indirection counts as
 * reached instead of showing up as a false orphan.
 */
for (const m of gateText.matchAll(/scripts\/[A-Za-z0-9/_.-]+\.mjs/g)) {
  const file = join(ROOT, m[0]);
  if (existsSync(file)) gateText += String.fromCharCode(10) + readFileSync(file, "utf8");
}

/**
 * Deliberately outside every gate. Each entry says why, and why that is acceptable.
 * Shrink this list; do not grow it without a reason a reviewer would accept.
 */
const UNREACHED = new Map([
  [
    "onboarding-comprehension.test.mjs",
    "RED as of 2026-09-08, and not wiring: two assertions fail — 'ready phase explains the first-session outcome with a non-answer-revealing example' and 'the only ready-phase route remains the first thinking session'. Nobody knew, because the file sat in no gate. Fix the onboarding ready phase, then wire it in and delete this entry.",
  ],
  [
    "session-task-surfaces.test.mjs",
    "RED as of 2026-09-08: expects /Уровень 1/ from a surface that no longer renders that string. Decide whether the expectation or the surface is wrong, then wire it in.",
  ],
]);

const files = readdirSync(join(ROOT, "tests")).filter((f) => f.endsWith(".mjs"));
const orphans = [];
const reached = new Set();
for (const f of files) {
  if (gateText.includes(`tests/${f}`)) reached.add(f);
  else orphans.push(f);
}

for (const f of orphans) {
  if (UNREACHED.has(f)) continue;
  fail(`tests/${f} is in no gate — not in npm test, not in verify:release, not in CI. Wire it in, or register it in UNREACHED with a reason.`);
}
for (const [f] of UNREACHED) {
  if (reached.has(f)) {
    fail(`tests/${f} is registered as unreachable but a gate now runs it — remove it from UNREACHED in this same change.`);
  } else if (!files.includes(f)) {
    fail(`tests/${f} is registered in UNREACHED but no longer exists — remove the entry.`);
  }
}

if (failed === 0) {
  pass(`${reached.size} of ${files.length} test files are reachable from a gate; ${UNREACHED.size} registered as deliberately not`);
}
console.log(`\nTEST REACHABILITY: ${failed === 0 ? "all passed" : "FAILURES"} (${failed} failed)`);
process.exit(failed === 0 ? 0 : 1);
