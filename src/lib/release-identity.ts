const RELEASE_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

/**
 * Which commit is actually serving this request.
 *
 * Order matters and used to be backwards. `VERCEL_GIT_COMMIT_SHA` is injected by the build
 * that is running right now and cannot be stale; `ACADEMY_RELEASE_SHA` is a hand-set variable
 * for hosts that inject nothing. When the manual one won, a value set once in the Vercel
 * dashboard kept overriding every later build: on 2026-08-14 the `X-Academy-Release-Sha`
 * header still announced a commit from 2026-08-02 while `/api/version` — which reads the two
 * in the opposite order — correctly reported the deployed sha. The header is what
 * `scripts/qa/prod-smoke.mjs` compares its expected sha against, so the one instrument that
 * answers «did the right commit land?» was answering «yes» by echoing the operator's own guess.
 *
 * The manual variable is now what it is documented to be: the expected value an operator
 * asserts against, not the value the server reports about itself.
 *
 * A malformed value is skipped rather than fatal, so a leftover «not-a-sha» in one variable
 * can no longer blank out a perfectly good sha in the other.
 */
export function resolveReleaseSha(
  env: Record<string, string | undefined> = process.env
): string | null {
  for (const raw of [env.VERCEL_GIT_COMMIT_SHA, env.ACADEMY_RELEASE_SHA]) {
    const sha = (raw ?? "").trim().toLowerCase();
    if (RELEASE_SHA_PATTERN.test(sha)) return sha;
  }
  return null;
}
