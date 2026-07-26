#!/usr/bin/env node
/** Browser contract: harmless nonsense gets pedagogical feedback, not a safety refusal or reward. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, ["scripts/e2e/lesson-flow.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    BASE_URL: "http://localhost:3014",
    E2E_WRONG_ANSWER_ONLY: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

const timeout = setTimeout(() => child.kill("SIGTERM"), 120000);
const exitCode = await new Promise((resolve) => child.on("close", resolve));
clearTimeout(timeout);

if (exitCode !== 0 || !/WRONG_ANSWER_E2E PASSED/.test(output)) {
  console.error(output);
  throw new Error(`Wrong-answer browser contract failed (exit=${exitCode}).`);
}

console.log("PASS wrong harmless answer remains pedagogical in a real browser");
