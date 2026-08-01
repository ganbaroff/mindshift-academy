import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const suite = readFileSync(join(root, "tests/e2e/current-session-ui.mjs"), "utf8");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

assert.match(suite, /firefox/, "current-session browser suite declares Firefox smoke");
assert.match(suite, /webkit/, "current-session browser suite declares WebKit smoke");
assert.match(suite, /reload|page\.reload/, "cross-browser smoke proves reload resume");
assert.match(suite, /formulation-input/, "cross-browser smoke reaches capstone formulation");
assert.match(suite, /capstone-calm-closure/, "cross-browser smoke reaches capstone closure");
assert.match(suite, /verdict: ["']BLOCKED["']/, "missing browser binaries fail closed");
assert.equal(packageJson.scripts["test:cross-browser:current-sessions"], "npx tsx scripts/e2e/current-session-flow.mjs --cross-browser");

console.log("cross-browser-smoke-contract: expected Firefox/WebKit current-session proof is present");
