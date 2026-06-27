import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ipAddress } from "@vercel/functions";

// P0-4 (prod-safe rate limiting). The old code silently fell back to a dummy Upstash URL /
// per-instance in-memory map — which is NO throttle at all on serverless (Vercel = many
// ephemeral lambdas). A silent no-op limit is worse than none: it looks protected, isn't.
//
// This module:
//   - uses a REAL distributed Upstash limiter when UPSTASH_REDIS_REST_URL/TOKEN are set;
//   - otherwise LOUDLY warns and uses a per-instance in-memory fallback (good enough to prove
//     the limit locally / single-instance, useless across lambdas — hence the warning);
//   - exposes `rateLimitMisconfiguredInProd()` so cost endpoints can FAIL CLOSED in production
//     rather than burn money unthrottled.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
export const DISTRIBUTED = !!(url && token && !url.includes("dummy"));
const PROD = process.env.NODE_ENV === "production";

if (!DISTRIBUTED) {
  // Loud, not silent. This is the difference the audit demanded.
  console.error(
    "\n⚠️  RATE LIMITING IS NOT DISTRIBUTED — UPSTASH_REDIS_REST_URL/TOKEN unset (or dummy).\n" +
      "    Falling back to a per-instance in-memory limiter. This does NOT throttle across\n" +
      "    serverless lambdas (e.g. Vercel). Set real Upstash creds before production.\n"
  );
}

const redis = DISTRIBUTED ? new Redis({ url: url!, token: token! }) : null;
const upstashCache = new Map<string, Ratelimit>();
const mem = new Map<string, number[]>();

/** Returns true in production when there is no distributed limiter — cost endpoints should refuse. */
export function rateLimitMisconfiguredInProd(): boolean {
  return PROD && !DISTRIBUTED;
}

/**
 * Trusted per-caller key for PUBLIC (unauthenticated) endpoints. Uses Vercel's official
 * `ipAddress()` (the platform-derived client IP) — NOT a raw header trusted by reputation.
 * Returns `null` when no trusted IP is available IN PRODUCTION: the caller MUST refuse (429),
 * and must NEVER collapse all anonymous callers into one shared constant bucket — that would be
 * a global self-DoS (a single stripped header takes the whole public funnel down for everyone).
 * Dev gets one local bucket, gated on NODE_ENV so it can never be reached in production.
 * Spoof-resistance is a platform property (Vercel overwrites the IP headers) — it can only be
 * verified on a real Vercel deploy, not in dev where `ipAddress` reads raw headers.
 */
export function publicClientKey(req: Request): string | null {
  const ip = ipAddress(req);
  if (ip) return ip;
  if (PROD) return null;
  return "dev-local";
}

/** Sliding-window rate limit. `bucket` namespaces the limit; `key` is the per-caller key (IP or userId). */
export async function rateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSec: number
): Promise<{ success: boolean; source: "upstash" | "in-memory" }> {
  if (redis) {
    let rl = upstashCache.get(bucket);
    if (!rl) {
      rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSec} s` as `${number} s`),
        prefix: `rl:${bucket}`,
      });
      upstashCache.set(bucket, rl);
    }
    const r = await rl.limit(key);
    return { success: r.success, source: "upstash" };
  }

  // In-memory fallback (single instance only).
  const now = Date.now();
  const k = `${bucket}:${key}`;
  const recent = (mem.get(k) || []).filter((t) => now - t < windowSec * 1000);
  recent.push(now);
  mem.set(k, recent);
  return { success: recent.length <= limit, source: "in-memory" };
}
