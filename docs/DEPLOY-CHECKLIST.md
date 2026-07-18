# Deploy checklist (production)

## 🔴 HARD dependency — Upstash Redis (rate limiting)

Rate limiting (`src/lib/ratelimit.ts`) requires a **real** distributed store in production.
Without it ALL rate-limited endpoints — including `/api/chat` (the most expensive, ~6 LLM
calls) and the public `/api/generate-silhouette` funnel — **fail closed** (HTTP 503): a silent
in-memory "limit" does NOT throttle across Vercel's ephemeral lambdas, and a silent no-op is
worse than none. **Consequence: deploy without Upstash and the whole product 503s** (chat,
monster, tts, silhouette all dead; onboarding broken).

🔴 **LAUNCH-BLOCKER:** before going live, (1) set real Upstash creds, and (2) **prove the
distributed limit across TWO instances on real Redis** — the only proof so far is
single-instance in-memory, which does not throttle on serverless.

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
Public endpoints key by Vercel's official `ipAddress()` (`@vercel/functions`) via
`publicClientKey()` — NOT a raw header. Raw `x-forwarded-for` is never used (a client rotates it
to mint fresh buckets). **In production, when no trusted IP is available the request is REFUSED
(429)** — never bucketed into a shared constant (that would self-DoS the whole funnel).
⚠️ **Spoof-resistance is a platform property** (Vercel overwrites the IP headers) and can ONLY be
verified on a real Vercel deploy — it is NOT testable in dev, where `ipAddress` reads raw headers.

## Other prod prerequisites (from the audit — still open)
- **NVIDIA_API_KEY** — confirm it was rotated after the 2026-05-10 leak (it powers the tutor
  AND the safety classifiers). `.env` is gitignored; check the build.nvidia.com dashboard.
- **OPENAI_API_KEY** — optional; when set, `/api/tts` and `/api/monster` make paid calls
  (now auth + rate-limited).
- **COPPA / GDPR-K (P0-3):** ✅ parental-consent layer BUILT + enforced — fail-closed,
  server-side on every child-data path; `/consent` email-plus flow with two opt-ins; NO child
  free-text egresses before consent (see COPPA-CONSENT-SPEC.md). Still REQUIRED before real
  under-13 users: **legal sign-off** on the consent/privacy copy (HANDOVER-2026-07-18.md §6.A).
- **Reward modal freeze (P0-5):** ✅ FIXED — the reward gem is static; the infinite y-bob that
  caused a ~45s GPU-recomposite freeze on the iPad target was removed.
- Clerk keys are dev keys (`Clerk has been loaded with development keys`) — swap for prod.

> Current open items for launch are tracked in **HANDOVER-2026-07-18.md** §6–§7. This checklist's
> hard Upstash dependency (above) still stands.
