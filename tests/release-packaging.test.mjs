#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vercelIgnore = readFileSync(join(root, ".vercelignore"), "utf8")
  .split(/\r?\n/)
  .filter(Boolean);
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const proxySource = readFileSync(join(root, "src", "proxy.ts"), "utf8");
const envExample = readFileSync(join(root, ".env.example"), "utf8");

assert.deepEqual(vercelIgnore, [
  ".env",
  ".env.*",
  "!.env.example",
  ".clerk/",
  "*.db",
  "dev.db",
  "prisma/dev.db",
  "node_modules/",
  ".next/",
  ".git/",
  ".superpowers/",
  ".agents/",
  ".claude/",
  "memory/",
]);

assert.equal(packageJson.dependencies.next, "16.2.12");
assert.equal(packageJson.devDependencies["eslint-config-next"], "16.2.9");
assert.equal(packageJson.dependencies["@prisma/client"], "7.9.1");
assert.equal(packageJson.devDependencies.prisma, "7.9.1");
assert.equal(packageJson.overrides.sharp, "0.35.3");
assert.equal(packageJson.dependencies["@clerk/localizations"], "4.13.6");
assert.match(proxySource, /authorizedParties/);
assert.match(proxySource, /https:\/\/academy\.volaura\.app/);
assert.match(proxySource, /x-academy-release-sha/);
assert.match(readFileSync(join(root, "scripts", "qa", "prod-smoke.mjs"), "utf8"), /ACADEMY_RELEASE_SHA/);
assert.match(readFileSync(join(root, "scripts", "qa", "prod-smoke.mjs"), "utf8"), /x-academy-release-sha/);
assert.match(
  envExample,
  /^NEXT_PUBLIC_CLERK_JS_URL=https:\/\/clerk\.academy\.volaura\.app\/npm\/@clerk\/clerk-js@6\/dist\/clerk\.browser\.js$/m,
);
assert.equal(packageJson.scripts["test:release-packaging"], "node tests/release-packaging.test.mjs");
assert.match(packageJson.scripts["verify:release"], /node tests\/release-packaging\.test\.mjs/);
assert.match(packageJson.scripts["verify:release"], /node tests\/release-copy\.test\.mjs/);

console.log("Release packaging contract passed");
