#!/usr/bin/env node
/**
 * Runs the child-data lifecycle contract on a throwaway, schema-current SQLite
 * database. The contract must never depend on a developer's long-lived dev.db.
 */
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal ?? `code ${code}`}`));
    });
  });
}

const tempDir = await mkdtemp(join(tmpdir(), "mindshift-child-data-"));
const databaseUrl = `file:${join(tempDir, "lifecycle.db").replaceAll("\\", "/")}`;
const env = { ...process.env, DATABASE_URL: databaseUrl, TURSO_DATABASE_URL: databaseUrl };
delete env.TURSO_AUTH_TOKEN;

try {
  await run(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--url", databaseUrl], env);
  await run(process.execPath, ["scripts/test-child-data-lifecycle.mjs"], env);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
