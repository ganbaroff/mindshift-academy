# Deploy checklist (production)

## 🔴 HARD dependency — Upstash Redis (rate limiting)

Rate limiting (`src/lib/ratelimit.ts`) requires a **real** distributed store in production.
Without it the cost endpoints **fail closed** (HTTP 503) on purpose — a silent in-memory
"limit" does NOT throttle across Vercel's ephemeral lambdas, and a silent no-op is worse than
none. The flip side: **without Upstash the public silhouette funnel returns 503 and onboarding
breaks.** So this is mandatory, not optional.

Set both env vars to **real** values (not the `dummy-*` placeholders):

```
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

On boot, `ratelimit.ts` logs a loud `⚠️ RATE LIMITING IS NOT DISTRIBUTED` error if these are
unset/dummy. If you see that line in production logs, rate limiting is OFF (and cost endpoints
are 503ing) — fix the env immediately.

### Per-endpoint limits (tunable in the route handlers)
| Endpoint | Key | Limit | Notes |
|---|---|---|---|
| `/api/chat` | userId (clerkId), else trusted IP | 20 / 10s | most expensive (~6 LLM calls); fail-closed in prod |
| `/api/tts` | userId | 15 / 60s | paid TTS; fail-closed |
| `/api/monster` | userId | 10 / 60s | paid gpt-image; fail-closed |
| `/api/generate-silhouette` | trusted IP (`x-real-ip`) | 6 / 60s | public funnel; fail-closed |

### Trusted client IP (anti-spoofing)
Public endpoints key by `x-real-ip` (set by the Vercel edge, not client-forgeable) via
`publicClientKey()`. Raw `x-forwarded-for` is **deliberately not used** — a client can rotate
it per request to mint fresh buckets. For stricter guarantees use `ipAddress()` from
`@vercel/functions`. **Once Upstash creds exist, re-prove the distributed limit** (multi-lambda)
— the current proof is single-instance (in-memory) only.

## Other prod prerequisites (from the audit — still open)
- **NVIDIA_API_KEY** — confirm it was rotated after the 2026-05-10 leak (it powers the tutor
  AND the safety classifiers). `.env` is gitignored; check the build.nvidia.com dashboard.
- **OPENAI_API_KEY** — optional; when set, `/api/tts` and `/api/monster` make paid calls
  (now auth + rate-limited).
- **COPPA / GDPR-K (P0-3, NOT done):** no parental consent, no age gate, no privacy policy;
  child prompts are sent to a foreign LLM (NVIDIA, US) with no DPA/retention. Fix the data path
  before onboarding real under-13 users.
- **Reward modal freeze (P0-5, NOT done):** freezes the device on the iPad target.
- Clerk keys are dev keys (`Clerk has been loaded with development keys`) — swap for prod.
