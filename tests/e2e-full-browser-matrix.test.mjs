#!/usr/bin/env node
/** Full L1–L5 provider/browser proof in every supported Playwright engine. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const browsers = ["chromium", "firefox", "webkit"];

async function run(browser, port) {
  const child = spawn(process.execPath, ["scripts/e2e/lesson-flow.mjs"], {
    cwd: root,
    env: { ...process.env, E2E_BROWSER: browser, BASE_URL: `http://localhost:${port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const timeout = setTimeout(() => child.kill("SIGTERM"), 180000);
  const exitCode = await new Promise((resolve) => child.on("close", resolve));
  clearTimeout(timeout);
  if (exitCode !== 0 || !new RegExp(`E2E_BROWSER=${browser}`).test(output) || !/E2E PASSED: all 5 lessons/.test(output)) {
    console.error(output);
    throw new Error(`${browser} full L1-L5 E2E failed (exit=${exitCode}).`);
  }
  console.log(`PASS ${browser} full L1-L5 browser path`);
}

for (const [index, browser] of browsers.entries()) {
  await run(browser, 3020 + index);
}
