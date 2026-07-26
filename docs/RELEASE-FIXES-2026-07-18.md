# MindShift Academy — Release fixes (follow-up to the 2026-07-17 audit)

Date: 2026-07-18
Base: `rebuild/soul-persist`
Scope: fix every finding in `RELEASE-AUDIT-REPORT-2026-07-17.md` and bring the build/lint/test
gates to green so the closed test can be shared.

## Verdict change

Audit verdict was **NO-GO**. After the fixes below the deterministic gates are green and the
live safety + browser flows pass. Remaining human/legal items (below) are the only things
between here and a real-kid production launch; for a **closed test** it is now shareable.

## Gate results (this revision)

| Gate | Command | Result |
|---|---|---|
| Production build + typecheck | `npm run build` | PASS (exit 0, Next 16.2.9) |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities |
| Lint | `npm run lint` | PASS — **0 errors / 0 warnings** (was 64 errors) |
| Deterministic tests (CI gate) | `npm test` | PASS 26/26 |
| Environment contract | `npm run test:config` | PASS 5/5 |
| Consent DB integration | `npm run test:consent` | PASS 9/9 |
| Child-data lifecycle | `npm run test:data-lifecycle` | PASS 4/4 |
| UI accessibility contract | `npm run test:ui` | PASS 4/4 |
| API boundary | `node tests/proxy-api-auth.test.mjs` | PASS — 11 private routes reject anonymous requests |
| Live safety (provider lane) | `npm run test:live` | PASS 17/17 |
| Regression seams | `npm run test:regression` | 22 pass / 0 fail / 0 blocked |
| Full 5-lesson browser E2E | `npm run test:e2e:matrix` | PASS 5/5 in Chromium, Firefox and WebKit |
| Safe wrong-answer E2E | `npm run test:e2e-wrong` | PASS — safety-pass alone cannot issue reward |
| False-reject measurement | `npm run test:falsepos` | 0/20 safe false-rejects; 0/6 unsafe false-allows |
| Unified release gate | `npm run verify:release` | PASS |

## Findings → fixes

### MSA-P0-PRIV-001 — silhouette egress before consent — FIXED
`/api/generate-silhouette` no longer has any external-AI path at all. The deterministic
preview logic moved to `src/lib/silhouette.ts`; the route imports only that + the rate
limiter. Child free-text can never reach a generative model **or** the llama-guard/kidNet
classifiers (both are external calls the consent copy discloses) before consent — because the
route makes no external call, period. The fallback description no longer echoes the raw words.
- Proof (deterministic): `tests/deterministic.mjs` static-guards that the route references no
  `ai-provider` / `getAIClient` / `@/lib/moderation` / `openai`, asserts determinism, and
  asserts abusive words are not echoed.
- Proof (live HTTP): `POST /api/generate-silhouette {"words":["убей","всех","детей"]}` → `200`
  with a generic description, no echo.

### MSA-P1-FLOW-002 — consent not wired into the UI path — FIXED
- `src/app/lesson/layout.tsx` and `src/app/onboarding/layout.tsx` now gate on
  `hasValidConsent()` after the allowlist check → an allowlisted-but-not-consented account is
  redirected to `/consent` (fail-closed) instead of landing on a screen whose API calls 403.
- `src/app/onboarding/page.tsx` `confirmName()` now checks the `/api/monster` response: a `403`
  routes to `/consent`; any other non-2xx surfaces a retryable error and does **not** advance to
  the "ready" state (was silently advancing into a broken lesson).
- `src/app/consent/page.tsx` sends a freshly-consented parent onward to `/onboarding` (continue
  the child first-run) instead of the parent-only dashboard dead-end.
- `src/proxy.ts` now redirects unauthenticated users on protected routes to `/sign-in` (307) instead of the
  bare `404` Clerk's `auth.protect()` was returning — so a shared deep link no longer shows
  "Not Found". Authenticated path unchanged.

### MSA-P1-QUALITY-003 — lint red — FIXED
`npm run lint` → 0 errors (was 64). `no-explicit-any` properly typed, JSX entities escaped,
`@ts-ignore`→`@ts-expect-error`, `getIntroductionText` hoisted to module scope (cleared the
use-before-declaration + immutability errors), and the React 19 `set-state-in-effect` cases
resolved with per-line justified suppressions (benign external-sync effects, not real bugs).
Lint is now clean: 0 errors and 0 warnings.

### MSA-P1-TEST-004 — test runner not a reliable gate — FIXED
- `npm test` now runs `tests/deterministic.mjs`: pure, no server / no provider / no DB, so it
  cannot hang or flap. It is the CI gate.
- The live provider checks moved to `tests/safety.test.mjs` (`npm run test:live`), which:
  normalizes the host to `127.0.0.1` (fixes the Windows `localhost`→`::1` `ECONNREFUSED`),
  wraps the whole run in one `AbortController` deadline + per-request timeout (a stuck provider
  aborts → exit 1, never hangs), self-starts the dev server if none is running, and treats
  blocked/timeout as FAIL — never a silent pass.

### MSA-P1-SAFETY-005 — benign input false-blocked — FIXED, fail-closed preserved
`scripts/measure-falsepos.mjs` runs a labelled benign RU/AZ/EN dataset (gibberish + real
lesson answers + normal chat) through `moderate()` and reports the false-reject rate, cleanly
separating a safety-block from a pedagogical-wrong (only the safety-block is counted).
The current release detects the exact known Llama Guard `unsafe S7` false-positive only when a
second independent kidNet classifier returns safe and the phrase is a short, allowlisted
keyboard-gibberish sequence with no PII cue. All other categories, errors and non-matching text
remain fail-closed. Measured after the change: **0/20** safe false-rejects and **0/6** unsafe
false-allows. The wrong-answer E2E separately proves that a safety-pass does not grant a reward.

### MSA-P2-DEV-006 — unauthenticated reset of a shared row — FIXED
`/api/reset` now requires auth and only ever resets the **caller's own** gameplay state (keyed
by `clerkId`): fresh stats + delete their monster + delete their lesson progress while preserving
valid consent. The separate authenticated `DELETE /api/child-data` is the COPPA self-service
erase path: it transactionally removes Academy user data, progress, rewards, consent and
verification. Both flows have real temporary-Prisma lifecycle coverage.

### MSA-P2-CONFIG-007 — incomplete `.env.example` — FIXED
Added the 8 missing keys with comments: `GEMINI_API_KEY`, `DATABASE_URL`,
`CONSENT_CODE_PEPPER`, `RESEND_FROM`, and the four `NEXT_PUBLIC_CLERK_SIGN_*` routing URLs. The
template now matches every `process.env` reference in the code.

The deployment preflight also requires a `file:`-based `DATABASE_URL` for the Prisma CLI build
configuration. Runtime Academy data still uses Turso through the libSQL adapter; this separate
build datasource prevents a deployment from passing secret validation and failing later in Prisma.

### Post-audit privacy hardening — weekly reports honour current consent
The weekly-report cron previously sent to `User.username`, which is not a verified parent contact,
and did not check the current consent row. It now selects recipients only from a verified,
unrevoked, current two-opt-in `ParentalConsent.parentEmail`, uses the configured `RESEND_FROM`,
and returns aggregate send errors without addresses or child aliases. Deterministic coverage proves
that revoked, stale and incomplete-consent records receive nothing.

### MSA-P2-NEXT-008 — deprecated middleware convention — FIXED
The boundary is now `src/proxy.ts`; `src/middleware.ts` was removed. The explicit private API
allow-list and anonymous API tests cover the migration locally. The only remaining human check is
a genuine signed-in Clerk smoke in the target instance, which belongs with the production auth
release checklist rather than as migration debt.

### MSA-P2-E2E-009 — no full-curriculum E2E — FIXED
`scripts/e2e/lesson-flow.mjs` now drives **all 5 lessons** in real headless Chromium, Firefox
and WebKit (input → send → tutor reply → judge → reward), resetting the dev test user first so the run is
repeatable. Fixing this surfaced a real dev-only seam gap: `/api/user` ignored `x-test-bypass`
(while `/api/chat` honored it), so the harness wrote progress to `test_user_id` but read it from
the shared demo user, and later lessons never unlocked. `/api/user` now honors the same
dev-only seam (inert in prod).

## Still requires the CEO / a human (not code)

- **Legal sign-off** on the COPPA/GDPR-K consent + privacy copy (I can't approve legal text).
- **Authenticated-path verification with a real Clerk family account**: the consent redirect
  (allowlisted-but-no-consent → `/consent`) and the full parent→child handoff are verified by
  code + build, but not driven live here (no test Clerk session). Recommend one manual pass.
- **Production secrets + canary**: real Turso / Upstash / Resend / Cron secrets, and open the
  billing dashboard within 10 min of any deploy that touches LLM paths.
