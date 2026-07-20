/** Request-boundary policy shared by the Next proxy and deterministic tests. */
const PUBLIC_API_PATHS = new Set([
  "/api/generate-silhouette", // deterministic local preview; no auth or AI egress
  "/api/checkout", // disabled endpoint that returns 410 and has no side effects
  "/api/cron/mood-decay", // bearer-secret authenticated inside the route
  "/api/cron/weekly-report", // bearer-secret authenticated inside the route
  "/api/access-code/activate", // token-gated parent activation; no Clerk session yet
  "/api/access-code/redeem", // public child redemption; rate-limited, the code IS the credential
]);

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.has(pathname);
}

/** The Playwright/safety seam must be impossible to activate in production. */
export function hasDevTestBypass(
  headers: Headers,
  nodeEnv = process.env.NODE_ENV
): boolean {
  return nodeEnv === "development" && headers.get("x-test-bypass") === "true";
}
