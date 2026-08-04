#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GATE_DEFINITIONS,
  gateEnvironment,
  makeGateReceipt,
  platformInvocation,
  validateGateRequest,
} from "./academy-gates.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const mode = process.argv[2];
const startedAt = new Date().toISOString();
const validationErrors = validateGateRequest(mode, process.env);
const commandEnv = gateEnvironment(mode, process.env);
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();

const safeStamp = startedAt.replaceAll(":", "-");
const evidenceRoot = resolve(
  root,
  process.env.ACADEMY_GATE_EVIDENCE_DIR || ".superpowers/sdd/evidence"
);
const receiptPath = join(evidenceRoot, `${safeStamp}-${mode || "unknown"}.json`);

if (!GATE_DEFINITIONS[mode]) {
  for (const error of validationErrors) console.error(`BLOCKED: ${error}`);
  process.exit(2);
}

function worktreeIsContentClean() {
  const unstaged = spawnSync("git", ["diff", "--quiet"], { cwd: root }).status;
  const staged = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: root }).status;
  const untracked = execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" }
  ).trim();
  return unstaged === 0 && staged === 0 && !untracked;
}

const preflightWorkspaceClean = worktreeIsContentClean();
if (!preflightWorkspaceClean) {
  validationErrors.push("Academy gates require a clean frozen worktree");
}

function persist(receipt) {
  mkdirSync(evidenceRoot, { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(`ACADEMY_GATE_RECEIPT=${receiptPath}`);
  console.log(`ACADEMY_GATE_VERDICT=${receipt.verdict}`);
}

if (validationErrors.length > 0) {
  for (const error of validationErrors) console.error(`BLOCKED: ${error}`);
  persist(
    makeGateReceipt({
      mode: mode || "unknown",
      sha,
      startedAt,
      finishedAt: new Date().toISOString(),
      commands: [],
      blockedReason: validationErrors.join("; "),
      workspaceClean: preflightWorkspaceClean,
    })
  );
  process.exit(2);
}

const definition = GATE_DEFINITIONS[mode];
const expectedCommands = definition.commands.map(([command, args]) =>
  [command, ...args].join(" ")
);
const commandReceipts = [];
console.log(`Academy gate: ${mode}`);
console.log(`SHA: ${sha}`);
console.log(definition.description);

for (const [command, args] of definition.commands) {
  const display = [command, ...args].join(" ");
  const commandStarted = Date.now();
  console.log(`\n> ${display}`);
  const invocation = platformInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: root,
    env: commandEnv,
    shell: false,
    stdio: "inherit",
  });
  const exitCode = result.status ?? 1;
  commandReceipts.push({
    command: display,
    exitCode,
    elapsedMs: Date.now() - commandStarted,
  });
  if (exitCode !== 0) break;
}

const finalSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const workspaceClean = worktreeIsContentClean() && finalSha === sha;
const warnings = workspaceClean
  ? []
  : ["Tracked content, untracked files, staged content, or HEAD changed during the gate"];
const receipt = makeGateReceipt({
  mode,
  sha,
  startedAt,
  finishedAt: new Date().toISOString(),
  commands: commandReceipts,
  expectedCommands,
  workspaceClean,
  warnings,
});
persist(receipt);
process.exit(receipt.verdict === "PASS" ? 0 : 1);
