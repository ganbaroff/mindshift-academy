#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  GATE_DEFINITIONS,
  GATE_MODES,
  gateEnvironment,
  makeGateReceipt,
  platformInvocation,
  validateGateRequest,
} from "../scripts/qa/academy-gates.mjs";

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, pass: true });
    console.log(`  PASS  ${name}`);
  } catch (error) {
    checks.push({ name, pass: false });
    console.error(`  FAIL  ${name}: ${error.message}`);
  }
}

console.log("\n=== Academy release gate contract ===");

check("declares exactly four bounded gate modes", () => {
  assert.deepEqual(GATE_MODES, ["offline", "browser", "live", "prod"]);
});

check("offline gate is deterministic and excludes provider/browser suites", () => {
  const serialized = JSON.stringify(GATE_DEFINITIONS.offline.commands);
  assert.match(serialized, /test:tasks/);
  assert.match(serialized, /test:session/);
  assert.match(serialized, /test:attempt-trust/);
  assert.match(serialized, /test:dual-children/);
  assert.match(serialized, /test:structured-attempt/);
  assert.match(serialized, /test:task-surfaces/);
  assert.match(serialized, /test:session-integration/);
  assert.match(serialized, /test:display-grid-accessibility/);
  assert.match(serialized, /test:onboarding-comprehension/);
  assert.match(serialized, /test:task-ownership-isolation/);
  assert.match(serialized, /test:mood-decay-privacy/);
  assert.match(serialized, /test:release-packaging/);
  assert.match(serialized, /test:consent/);
  assert.match(serialized, /test:data-lifecycle/);
  assert.match(serialized, /build/);
  assert.doesNotMatch(serialized, /test:live|test:falsepos|test:e2e/);
});

check("consent integration uses a throwaway schema-current database", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );
  assert.equal(
    packageJson.scripts["test:consent"],
    "node scripts/run-consent-contract.mjs"
  );
});

check("browser gate names the current session UI suite, not legacy lessons", () => {
  assert.deepEqual(GATE_DEFINITIONS.browser.commands, [
    ["npm", ["run", "test:e2e:current-sessions"]],
  ]);
});

check("gate runner resolves npm command shims without enabling a shell", () => {
  assert.deepEqual(
    platformInvocation("npm", ["--version"], {
      platform: "win32",
      execPath: "C:\\Program Files\\nodejs\\node.exe",
      npmExecPath: "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
    }),
    {
      command: "C:\\Program Files\\nodejs\\node.exe",
      args: [
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
        "--version",
      ],
    }
  );
  assert.deepEqual(
    platformInvocation("node", ["test.mjs"], { platform: "win32" }),
    { command: "node", args: ["test.mjs"] }
  );
  assert.deepEqual(
    platformInvocation("npm", ["test"], { platform: "linux" }),
    { command: "npm", args: ["test"] }
  );
  const actual = platformInvocation("npm", ["--version"]);
  const probe = spawnSync(actual.command, actual.args, {
    encoding: "utf8",
    shell: false,
  });
  assert.equal(probe.status, 0, probe.error?.message || probe.stderr);
});

check("offline gate strips provider credentials but preserves local build state", () => {
  const env = gateEnvironment("offline", {
    DATABASE_URL: "file:./dev.db",
    NVIDIA_API_KEY: "not-for-offline",
    OPENAI_API_KEY: "not-for-offline",
    GEMINI_API_KEY: "not-for-offline",
    AZURE_OPENAI_API_KEY: "not-for-offline",
    AZURE_OPENAI_KEY2: "not-for-offline",
    AZURE_API_KEY: "not-for-offline",
  });
  assert.equal(env.DATABASE_URL, "file:./dev.db");
  assert.equal(env.NVIDIA_API_KEY, undefined);
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.GEMINI_API_KEY, undefined);
  assert.equal(env.AZURE_OPENAI_API_KEY, undefined);
  assert.equal(env.AZURE_OPENAI_KEY2, undefined);
  assert.equal(env.AZURE_API_KEY, undefined);
});

check("live gate is fail-closed without explicit approval and cost ceiling", () => {
  const errors = validateGateRequest("live", {});
  assert.ok(errors.some((error) => error.includes("ACADEMY_ALLOW_LIVE_SMOKE=1")));
  assert.ok(errors.some((error) => error.includes("ACADEMY_LIVE_MAX_USD")));
  const missingRates = validateGateRequest("live", {
    ACADEMY_ALLOW_LIVE_SMOKE: "1",
    ACADEMY_LIVE_MAX_USD: "0.25",
  });
  assert.ok(missingRates.some((error) => error.includes("INPUT_USD_PER_MILLION")));
  assert.ok(missingRates.some((error) => error.includes("OUTPUT_USD_PER_MILLION")));
  assert.deepEqual(validateGateRequest("live", {
    ACADEMY_ALLOW_LIVE_SMOKE: "1",
    ACADEMY_LIVE_MAX_USD: "0.25",
    ACADEMY_LIVE_INPUT_USD_PER_MILLION: "1",
    ACADEMY_LIVE_OUTPUT_USD_PER_MILLION: "4",
  }), []);
});

check("production gate accepts only a fixed HTTPS origin", () => {
  assert.ok(validateGateRequest("prod", {}).length > 0);
  assert.ok(validateGateRequest("prod", { ACADEMY_PROD_URL: "http://academy.test" }).length > 0);
  assert.ok(
    validateGateRequest("prod", {
      ACADEMY_PROD_URL: "https://academy.volaura.app/path?secret=no",
    }).length > 0
  );
  assert.deepEqual(
    validateGateRequest("prod", { ACADEMY_PROD_URL: "https://academy.volaura.app" }),
    []
  );
});

check("receipt never upgrades missing evidence to PASS", () => {
  const incomplete = makeGateReceipt({
    mode: "offline",
    sha: "abc1234",
    startedAt: "2026-08-02T00:00:00.000Z",
    finishedAt: "2026-08-02T00:00:01.000Z",
    commands: [],
  });
  assert.equal(incomplete.verdict, "UNVERIFIED");

  const failed = makeGateReceipt({
    mode: "offline",
    sha: "abc1234",
    startedAt: "2026-08-02T00:00:00.000Z",
    finishedAt: "2026-08-02T00:00:01.000Z",
    commands: [{ command: "npm test", exitCode: 1, elapsedMs: 1 }],
    expectedCommands: ["npm test"],
  });
  assert.equal(failed.verdict, "FAIL");

  const malformed = makeGateReceipt({
    mode: "offline",
    sha: "abc123",
    startedAt: "2026-08-02T00:00:00.000Z",
    finishedAt: "2026-08-02T00:00:01.000Z",
    commands: [{ exitCode: 0 }],
    expectedCommands: ["npm test"],
  });
  assert.equal(malformed.verdict, "UNVERIFIED");

  const partial = makeGateReceipt({
    mode: "offline",
    sha: "abc123",
    startedAt: "2026-08-02T00:00:00.000Z",
    finishedAt: "2026-08-02T00:00:01.000Z",
    commands: [{ command: "npm test", exitCode: 0, elapsedMs: 1 }],
    expectedCommands: ["npm test", "npm run build"],
  });
  assert.equal(partial.verdict, "UNVERIFIED");

  const failedBeforeCompletion = makeGateReceipt({
    mode: "offline",
    sha: "abc1234",
    startedAt: "2026-08-02T00:00:00.000Z",
    finishedAt: "2026-08-02T00:00:01.000Z",
    commands: [{ command: "npm test", exitCode: 1, elapsedMs: 1 }],
    expectedCommands: ["npm test", "npm run build"],
  });
  assert.equal(failedBeforeCompletion.verdict, "FAIL");

  const invalidMetadata = makeGateReceipt({
    mode: "offline",
    sha: "bad",
    startedAt: "not-a-date",
    finishedAt: "2026-08-02T00:00:01.000Z",
    commands: [{ command: "npm test", exitCode: 0, elapsedMs: 1 }],
    expectedCommands: ["npm test"],
  });
  assert.equal(invalidMetadata.verdict, "UNVERIFIED");

  const complete = {
    mode: "offline",
    sha: "abc1234",
    startedAt: "2026-08-02T00:00:00.000Z",
    finishedAt: "2026-08-02T00:00:01.000Z",
    commands: [{ command: "npm test", exitCode: 0, elapsedMs: 1 }],
    expectedCommands: ["npm test"],
  };
  assert.equal(makeGateReceipt({ ...complete, workspaceClean: true }).verdict, "PASS");
  assert.equal(makeGateReceipt({ ...complete, workspaceClean: false }).verdict, "FAIL");
});

const failed = checks.filter((item) => !item.pass);
console.log(`\nAcademy gate contract: ${checks.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length === 0 ? 0 : 1);
