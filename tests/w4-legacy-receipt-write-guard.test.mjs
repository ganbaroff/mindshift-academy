#!/usr/bin/env node

import { readFileSync } from "node:fs";

const files = [
  "tests/w4-a11y-appendix.test.mjs",
  "tests/w4-session-matrix.test.mjs",
];
let failed = 0;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const guarded = source.includes('process.env.ACADEMY_WRITE_LEGACY_RECEIPTS === "1"');
  console.log(`${guarded ? "PASS" : "FAIL"}  ${file} guards legacy receipt writes by explicit opt-in`);
  if (!guarded) failed += 1;
}
if (failed) process.exit(1);
console.log("W4 LEGACY RECEIPT WRITE GUARD PASSED");
