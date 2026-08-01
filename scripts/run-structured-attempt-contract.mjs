#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { platformInvocation } from "./qa/academy-gates.mjs";

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal ?? `code ${code}`}`));
    });
  });
}

const tempDir = await mkdtemp(join(tmpdir(), "mindshift-structured-attempt-"));
const databaseUrl = `file:${join(tempDir, "structured.db").replaceAll("\\", "/")}`;
const env = {
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL: databaseUrl,
  TURSO_DATABASE_URL: databaseUrl,
  FAKE_AI: "1",
  FAKE_AI_MODE: "tutor_down",
};
delete env.TURSO_AUTH_TOKEN;

try {
  await run(
    process.execPath,
    ["node_modules/prisma/build/index.js", "db", "push", "--url", databaseUrl],
    env
  );
  const invocation = platformInvocation("npx", [
    "tsx",
    "tests/structured-attempt-route.test.mjs",
  ]);
  await run(invocation.command, invocation.args, env);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
