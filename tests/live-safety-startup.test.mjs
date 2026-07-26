#!/usr/bin/env node
/**
 * Regression test for the live-safety runner's Windows auto-start path.
 * It intentionally stops before Next can finish booting; the only contract
 * under test is that spawning the dev-server command does not fail with EINVAL.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const liveSafetySource = readFileSync(join(root, "tests", "safety.test.mjs"), "utf8");
const configuredDeadline = Number(
  liveSafetySource.match(/GLOBAL_DEADLINE_MS\s*=\s*Number\(process\.env\.DEADLINE_MS\s*\|\|\s*(\d+)\)/)?.[1],
);
if (!Number.isFinite(configuredDeadline) || configuredDeadline < 600000) {
  throw new Error(
    `Live safety needs at least 10 minutes for its sequential provider checks; configured=${configuredDeadline || "missing"}ms.`,
  );
}

const child = spawn(process.execPath, ["tests/safety.test.mjs"], {
  cwd: root,
  env: { ...process.env, DEADLINE_MS: "10000" },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

const exitCode = await new Promise((resolve) => child.on("close", resolve));
if (/spawn EINVAL/.test(output)) {
  console.error(output);
  throw new Error("Live-safety runner cannot auto-start Next on Windows (spawn EINVAL).");
}
if (!/starting `next dev`/.test(output)) {
  console.error(output);
  throw new Error(`Live-safety runner did not reach its auto-start path (exit=${exitCode}).`);
}
if (!/Server is up\./.test(output)) {
  console.error(output);
  throw new Error(`Live-safety runner started a process but could not reach Next (exit=${exitCode}).`);
}

console.log("PASS live-safety runner auto-starts a reachable Next server without spawn EINVAL");
