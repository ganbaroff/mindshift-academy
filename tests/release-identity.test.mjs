#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolveReleaseSha } from "../src/lib/release-identity.ts";

assert.equal(
  resolveReleaseSha({ ACADEMY_RELEASE_SHA: " 11BCAE577DECB5C9FE5E3194BAECA679C7388C7D " }),
  "11bcae577decb5c9fe5e3194baeca679c7388c7d"
);
assert.equal(
  resolveReleaseSha({ VERCEL_GIT_COMMIT_SHA: "3419bce" }),
  "3419bce"
);
assert.equal(
  resolveReleaseSha({ ACADEMY_RELEASE_SHA: "not-a-sha", VERCEL_GIT_COMMIT_SHA: "also-invalid" }),
  null
);
assert.equal(resolveReleaseSha({ ACADEMY_RELEASE_SHA: "" }), null);

console.log("Release identity contract passed");
