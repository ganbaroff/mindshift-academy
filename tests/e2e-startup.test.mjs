#!/usr/bin/env node
/** Contract: the Academy E2E script owns its local server when none is running. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, ["scripts/e2e/lesson-flow.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    BASE_URL: "http://localhost:3013",
    E2E_STARTUP_ONLY: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

const timeout = setTimeout(() => child.kill("SIGTERM"), 30000);
const exitCode = await new Promise((resolve) => child.on("close", resolve));
clearTimeout(timeout);

if (exitCode !== 0 || !/Server is up\./.test(output)) {
  console.error(output);
  throw new Error(`E2E did not self-start a reachable server (exit=${exitCode}).`);
}

console.log("PASS E2E self-starts a reachable Next server");
