#!/usr/bin/env node

import { readFileSync } from "node:fs";

const source = readFileSync("src/app/api/cron/mood-decay/route.ts", "utf8");
let failed = 0;
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failed += 1;
}

check(
  "warning logs do not interpolate user or monster identity-bearing fields",
  !/console\.log\([\s\S]{0,500}user\.username/.test(source) &&
    !/console\.log\([\s\S]{0,500}user\.monster\.name/.test(source)
);
check(
  "warning logs retain only aggregate-safe operational data",
  source.includes("[mood-decay] parent-warning") && source.includes("{ warned }")
);
check(
  "catch logging records the error type rather than raw error data",
  source.includes("errorType: error instanceof Error ? error.name : typeof error") &&
    !source.includes('console.error("[mood-decay] CRON failed:", error)')
);

if (failed) process.exit(1);
console.log("MOOD DECAY PRIVACY CONTRACT PASSED");
