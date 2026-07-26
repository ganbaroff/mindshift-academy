#!/usr/bin/env node
/** Browser contract for the harmless-wrong-answer path outside Chromium. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const browser = process.argv[2];
if (!new Set(["firefox", "webkit"]).has(browser)) {
  throw new Error("Usage: node tests/e2e-cross-browser.test.mjs <firefox|webkit>");
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = browser === "firefox" ? "3015" : "3016";
const child = spawn(process.execPath, ["scripts/e2e/lesson-flow.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    BASE_URL: `http://localhost:${port}`,
    E2E_WRONG_ANSWER_ONLY: "1",
    E2E_BROWSER: browser,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

const timeout = setTimeout(() => child.kill("SIGTERM"), 120000);
const exitCode = await new Promise((resolve) => child.on("close", resolve));
clearTimeout(timeout);

if (exitCode !== 0 || !new RegExp(`E2E_BROWSER=${browser}`).test(output) || !/WRONG_ANSWER_E2E PASSED/.test(output)) {
  console.error(output);
  throw new Error(`${browser} wrong-answer browser contract failed (exit=${exitCode}).`);
}

console.log(`PASS wrong harmless answer remains pedagogical in ${browser}`);
