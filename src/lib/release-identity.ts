const RELEASE_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export function resolveReleaseSha(
  env: Record<string, string | undefined> = process.env
): string | null {
  const raw = env.ACADEMY_RELEASE_SHA ?? env.VERCEL_GIT_COMMIT_SHA ?? "";
  const sha = raw.trim().toLowerCase();
  return RELEASE_SHA_PATTERN.test(sha) ? sha : null;
}
