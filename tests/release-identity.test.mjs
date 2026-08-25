#!/usr/bin/env node
/**
 * Which commit the server admits to running. The precedence assertions below are the
 * regression guard for 2026-08-14: the hand-set ACADEMY_RELEASE_SHA used to win, so a value
 * typed into the Vercel dashboard once kept announcing a commit from twelve days earlier
 * while the build had moved on — and `scripts/qa/prod-smoke.mjs`, which compares its expected
 * sha against exactly this header, could only ever agree with itself.
 */
import assert from "node:assert/strict";
import { resolveReleaseSha } from "../src/lib/release-identity.ts";

// The build-injected value wins. This is the whole fix.
assert.equal(
  resolveReleaseSha({
    VERCEL_GIT_COMMIT_SHA: "67fe6ccd88f7c280d0b1ee56c1383b40f4f99618",
    ACADEMY_RELEASE_SHA: "9a543f938e977b282bb4dd0b919f156fdfd6e042",
  }),
  "67fe6ccd88f7c280d0b1ee56c1383b40f4f99618"
);

// A leftover malformed value in one variable must not blank out a good sha in the other.
assert.equal(
  resolveReleaseSha({ VERCEL_GIT_COMMIT_SHA: "not-a-sha", ACADEMY_RELEASE_SHA: "3419bce" }),
  "3419bce"
);
assert.equal(
  resolveReleaseSha({ VERCEL_GIT_COMMIT_SHA: "3419bce", ACADEMY_RELEASE_SHA: "not-a-sha" }),
  "3419bce"
);

// The manual variable still answers on hosts that inject nothing, normalised as before.
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
assert.equal(resolveReleaseSha({}), null);

console.log("Release identity contract passed");
