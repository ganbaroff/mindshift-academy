#!/usr/bin/env node
// Deployment preflight. It reports missing CONFIGURATION NAMES only, never values.
import { existsSync } from "node:fs";
import { productionEnvProblems } from "../src/lib/production-env.ts";

// Local convenience only; hosted environments normally inject variables directly.
for (const filename of [".env.local", ".env"]) {
  if (existsSync(filename)) process.loadEnvFile(filename);
}

const problems = productionEnvProblems(process.env);
if (problems.length > 0) {
  console.error("PRODUCTION ENV PRECHECK FAILED. Configure non-placeholder values for:");
  for (const key of problems) console.error(`- ${key}`);
  process.exit(1);
}

console.log("PRODUCTION ENV PRECHECK PASSED (names validated; secret values were not logged).");
