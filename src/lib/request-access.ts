/** Request-boundary policy shared by the Next proxy and deterministic tests. */
const PUBLIC_API_PATHS = new Set([
  "/api/generate-silhouette", // deterministic local preview; no auth or AI egress
  "/api/checkout", // disabled endpoint that returns 410 and has no side effects
  "/api/cron/mood-decay", // bearer-secret authenticated inside the route
  "/api/cron/weekly-report", // bearer-secret authenticated inside the route
  "/api/access-code/activate", // token-gated parent activation; no Clerk session yet
  "/api/access-code/redeem", // public child redemption; rate-limited, the code IS the credential
  "/api/access-request", // public parent request inbox; rate-limited, grants nothing by itself
  "/api/version", // build provenance: reads two env values, returns a short sha
  "/api/health", // liveness probe: one memoised SELECT 1, reports no configuration
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

/**
 * Dev-only, page-level companion to hasDevTestBypass. The E2E harnesses' route
 * interception (see scripts/e2e/walkthrough-audit.mjs installAcademyBrowserRoutes)
 * only rewrites /api/** requests, so the x-test-bypass header never reaches a
 * page's own server-rendered document request. Pages outside proxy.ts's
 * isProtectedPage list (e.g. /map) need a second, narrowly-scoped seam: the SAME
 * ?demo=1 query param proxy.ts's isDemoPageBypass already uses for protected
 * pages, gated the same way -- development only, never production.
 */
export function hasDevDemoQueryBypass(
  searchParams: { demo?: string | string[] },
  nodeEnv = process.env.NODE_ENV
): boolean {
  return nodeEnv === "development" && searchParams.demo === "1";
}
