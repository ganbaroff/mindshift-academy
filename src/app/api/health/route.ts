import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveReleaseSha } from "@/lib/release-identity";

/**
 * GET /api/health — the one request an outside watcher can make to learn whether this
 * deployment is actually serving. Implements PREMIERE-AUDIT P2-03.
 *
 * Why it exists: until 2026-08-14 nothing outside the app ever asked. There is no Sentry, no
 * uptime probe and no log drain, so the first report of an outage would have come from a
 * parent. A liveness probe is the cheapest instrument that turns "someone tells us" into
 * "we already know", and `.github/workflows/watchdog.yml` polls exactly this route.
 *
 * Why not fold it into `/api/version`: that route's own contract is "no database, nothing to
 * rate limit", which is the reason it can sit on the public path list. Attaching a query to
 * it would quietly revoke that reasoning.
 *
 * What it deliberately does NOT report: which environment variables are set, their names, or
 * anything derived from their values. An unauthenticated endpoint that enumerates
 * configuration is a map drawn for whoever asks. Liveness is `ok`, `sha` and whether the
 * database answers — nothing a stranger could not learn by using the product.
 *
 * Cost control: the database probe is memoised for HEALTH_CACHE_MS per warm instance, so a
 * flood of requests to one instance costs one query per window rather than one per caller.
 * Measured honestly: under `next dev` the module is re-evaluated per request and the cache is
 * a no-op there (two consecutive calls reported different probe durations, 1862ms then
 * 1013ms), so treat it as a ceiling on a warm serverless instance, not as a guarantee. The
 * probe itself is `SELECT 1`; the cache is the second line of defence, not the first.
 *
 * Not covered, and not pretended: whether the two Vercel cron jobs ever ran. Nothing durable
 * records a cron run today, so a dead-man switch needs a schema field, and a schema change
 * needs a push to the live Turso database. Reporting an unmeasured "crons: ok" would be worse
 * than the silence it replaces.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEALTH_CACHE_MS = 15_000;
const DB_TIMEOUT_MS = 3_000;

type DbProbe = { status: "up" | "down"; ms: number };

let cached: { at: number; probe: DbProbe } | null = null;

async function probeDatabase(): Promise<DbProbe> {
  const now = Date.now();
  if (cached && now - cached.at < HEALTH_CACHE_MS) return cached.probe;

  const started = Date.now();
  let status: DbProbe["status"] = "down";
  try {
    // A timeout is the difference between "the database is slow" and "this request hangs
    // until the platform kills it" — a watchdog that never gets an answer reads as a
    // network problem rather than as the outage it is.
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB_PROBE_TIMEOUT")), DB_TIMEOUT_MS)
      ),
    ]);
    status = "up";
  } catch {
    // The error itself is never surfaced: adapter errors can carry the connection URL.
    status = "down";
  }

  const probe: DbProbe = { status, ms: Date.now() - started };
  cached = { at: now, probe };
  return probe;
}

export async function GET() {
  const db = await probeDatabase();
  const sha = resolveReleaseSha();
  const ok = db.status === "up";

  return NextResponse.json(
    {
      ok,
      sha: sha ? sha.slice(0, 7) : "unknown",
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      db,
    },
    {
      status: ok ? 200 : 503,
      headers: { "cache-control": "no-store" },
    }
  );
}
