# Deploy checklist (production)

> **Current release:** the technical release record for the deployed production version is
> [RELEASE-STATUS-2026-07-24.md](RELEASE-STATUS-2026-07-24.md). The remaining sections below are
> reusable runbook guidance and historical prerequisites, not a statement of the current live status.

## First command: secret/configuration preflight

Run `npm run check:prod-env` in the exact deployment environment before releasing. It validates
the full Academy contract (live Clerk keys, the exact custom-domain `NEXT_PUBLIC_CLERK_JS_URL`,
Prisma's `DATABASE_URL`, Turso, both AI providers, Upstash, Resend sender, consent pepper, cron secret and parent access configuration) and prints only missing
variable **names**, never their values. `DATABASE_URL` must be a SQLite `file:` URL for the Prisma
build configuration; Academy runtime data uses Turso. A failing preflight is a launch blocker.

For production at `https://academy.volaura.app`, set:

```env
NEXT_PUBLIC_CLERK_JS_URL=https://clerk.volaura.app/npm/@clerk/clerk-js@6/dist/clerk.browser.js
```

This avoids the Vercel preview proxy and loads Clerk JS from the verified Clerk Frontend API domain.

After the preflight succeeds, run `npm run verify:release` from the release candidate. It includes
the dependency audit, type/build verification, child-data lifecycle checks, safety corpus and the
three-browser lesson flow. A passing local release suite does not substitute for the live provider
and legal requirements below.

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
- Clerk keys are dev keys (`Clerk has been loaded with development keys`) — swap for prod **only
  after** the live Clerk custom domain is DNS/SSL-ready. Switching before then can make the
  deployed app point at an unavailable production instance.

## Production configuration status — 2026-07-18

The production Vercel project was inspected without printing secret values. `DATABASE_URL` was
corrected to Prisma's required `file:./dev.db` build URL; Academy runtime data continues to use
the configured Turso variables. The remaining configuration blockers are external:

- **Clerk domain `volaura.app`:** add and verify the five CNAME records shown by
  `clerk deploy status`. Until DNS, SSL and mail DNS are ready, do not replace Vercel's dev Clerk
  keys with the existing live keys.
- **Google OAuth:** disabled in the live Clerk instance because its client ID and secret were
  empty. Email-code sign-up/sign-in remains enabled. Re-enable Google only after supplying and
  validating real Google credentials.
- **Resend:** `volaura.app` remains `not_started`; add its DKIM and SPF DNS records, wait for a
  verified domain, then set `RESEND_FROM` to an address on that verified domain. Do not configure
  a guessed sender address.
- **Cloudflare access:** the Vercel-held API token can authenticate but has no access to the
  `volaura.app` zone, so it cannot create those records. Use the Cloudflare account that owns the
  zone, or issue a least-privilege zone-DNS token for `volaura.app`.

> Current open items for launch are tracked in **HANDOVER-2026-07-18.md** §6–§7. This checklist's
> hard Upstash dependency (above) still stands.
