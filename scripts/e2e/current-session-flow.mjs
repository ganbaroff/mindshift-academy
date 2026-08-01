#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const suitePath = join(root, "tests/e2e/current-session-ui.mjs");

if (!existsSync(suitePath)) {
  console.error(
    "BLOCKED: current /session browser suite is not implemented; legacy /lesson and API-choice matrices cannot certify this gate"
  );
  process.exit(2);
}

const suite = await import(pathToFileURL(suitePath).href);
if (typeof suite.runCurrentSessionUiSuite !== "function") {
  console.error("BLOCKED: current-session suite must export runCurrentSessionUiSuite()");
  process.exit(2);
}

const result = await suite.runCurrentSessionUiSuite();
process.exit(result === true ? 0 : 1);
