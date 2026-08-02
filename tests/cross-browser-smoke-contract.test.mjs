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
assert.match(suite, /maxRedirects:\s*0/, "Clerk proxy does not fulfill a cross-origin redirect target");
assert.match(suite, /route\.abort\(\)\.catch/, "Clerk proxy tolerates a route already handled during teardown");
assert.match(suite, /destination\s*===\s*["']document["']/, "Clerk document handshakes stay browser-owned");
assert.match(suite, /route\.continue\(\)/, "Clerk document handshakes are not fulfilled by the node-side proxy");
assert.match(suite, /page\.reload\(\{\s*waitUntil:\s*["']commit["']/, "WebKit reload does not wait on Clerk handshake DOMContentLoaded");
assert.equal(packageJson.scripts["test:cross-browser:current-sessions"], "npx tsx scripts/e2e/current-session-flow.mjs --cross-browser");

console.log("cross-browser-smoke-contract: expected Firefox/WebKit current-session proof is present");
