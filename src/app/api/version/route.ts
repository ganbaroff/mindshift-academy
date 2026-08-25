import { NextResponse } from "next/server";
import { resolveReleaseSha } from "@/lib/release-identity";

/**
 * GET /api/version — "which commit is actually live?" in one request.
 *
 * Until now that question needed git archaeology: fetch the homepage, grep for a string only the
 * newer build contains, and guess.
 *
 * This route used to resolve the sha itself, in the opposite order to `resolveReleaseSha`, which
 * is how the response header and this body came to disagree about the same deploy for twelve
 * days. There is now one resolver and one order; two answers to one question is worse than
 * either answer.
 *
 * Public and side-effect-free: it reads environment values and returns a short sha. No
 * secret, no user data, no database, nothing to rate limit.
 */
export function GET() {
  const sha = resolveReleaseSha();
  return NextResponse.json({
    sha: sha ? sha.slice(0, 7) : "unknown",
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
  });
}
