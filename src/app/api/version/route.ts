import { NextResponse } from "next/server";

/**
 * GET /api/version — "which commit is actually live?" in one request.
 *
 * Until now that question needed git archaeology: fetch the homepage, grep for a string only the
 * newer build contains, and guess. Vercel injects VERCEL_GIT_COMMIT_SHA at build time;
 * ACADEMY_RELEASE_SHA is the manual fallback for non-Vercel hosts.
 *
 * Public and side-effect-free: it reads two environment values and returns a short sha. No
 * secret, no user data, no database, nothing to rate limit.
 */
export function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.ACADEMY_RELEASE_SHA ?? "";
  return NextResponse.json({
    sha: sha ? sha.slice(0, 7) : "unknown",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  });
}
