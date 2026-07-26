# Academy Release Remediation Implementation Plan

> **For agentic workers:** Execute each task test-first; do not claim a release gate without fresh command output.

**Goal:** Deliver the MindShift Academy codebase with a protected Next 16 auth boundary, correct parent-controlled child-data lifecycle, reproducible Academy tests, and clean local quality gates.

**Architecture:** `src/proxy.ts` will be the single request-boundary policy: public endpoints remain explicit and all other Academy APIs require a Clerk session (except the development-only E2E seam). A small server-only data-lifecycle service will make restart and permanent deletion atomic; the dashboard parent control invokes the deletion route. Tests exercise pure boundary policy plus real local Prisma state.

**Tech Stack:** Next.js 16.2.9 App Router/Proxy, Clerk 7, Prisma 7 + libSQL, React 19, Playwright, Node test scripts.

## Global constraints

- Academy scope only; do not create production users, send emails, or alter production databases.
- Child free text remains blocked before external AI without valid parental consent.
- `x-test-bypass` is accepted only when `NODE_ENV === "development"`.
- All persistent child-data mutations use a transaction.
- Public routes must be a short, explicit allow-list; cron routes remain bearer-secret protected.

### Task 1: Next 16 Proxy and API auth contract

**Files:**
- Create: `src/lib/request-access.ts`
- Create: `src/proxy.ts`
- Delete: `src/middleware.ts`
- Modify: `tests/deterministic.mjs`
- Test: `tests/proxy-api-auth.test.mjs`

- [ ] Write failing pure assertions: only `/api/generate-silhouette`, `/api/checkout`, and the two cron paths are public; dev bypass is rejected outside development.
- [ ] Write the smallest `request-access.ts` exports:

```ts
export function isPublicApiPath(pathname: string): boolean
export function hasDevTestBypass(headers: Headers, nodeEnv = process.env.NODE_ENV): boolean
```

- [ ] Move Clerk wrapper to `src/proxy.ts`; return JSON 401 for an unauthenticated non-public API request, redirect protected pages to `/sign-in`, and leave public APIs/cron secret handlers reachable.
- [ ] Run deterministic assertions, then start a local Next server and prove anonymous `/api/user` is 401 while public silhouette retains its normal validation response.

### Task 2: Transactional restart and permanent data deletion

**Files:**
- Create: `src/lib/child-data.ts`
- Create: `src/app/api/child-data/route.ts`
- Modify: `src/app/api/reset/route.ts`
- Modify: `src/components/dashboard/ManageConsent.tsx`
- Modify: `docs/COPPA-CONSENT-SPEC.md`
- Test: `scripts/test-child-data-lifecycle.mjs`

- [ ] Write a failing local-DB test that creates a unique user with monster, inventory, lesson progress, reward event, consent, and verification rows.
- [ ] Implement `restartChildData(clerkId)` as one transaction that clears restartable progress (monster, inventory, progress, reward events) and resets stats/active step while preserving consent.
- [ ] Implement `deleteChildData(clerkId)` as one transaction that clears consent/verification, reward events, and the user (including cascaded monster, inventory, and progress).
- [ ] Add authenticated `DELETE /api/child-data`; no raw error text may reach the client.
- [ ] Add a dashboard confirmation state and clear success/failure copy; after success redirect to `/` without recreating child data.
- [ ] Run the lifecycle script and deterministic/build checks.

### Task 3: Reproducible E2E and quality cleanup

**Files:**
- Modify: `scripts/e2e/lesson-flow.mjs`
- Modify: `package.json`
- Modify only warning-owning files reported by ESLint
- Test: `tests/e2e-startup.test.mjs`

- [ ] Write a failing startup check proving `npm run test:e2e` launches a server on its own and tears it down on Windows.
- [ ] Make the E2E runner start local Next through `process.execPath` with the default host, wait by condition on `localhost`, and terminate its whole process tree.
- [ ] Require each lesson result to include a lesson-relevant tutor signal as well as chat/judge/reward; keep API failures fatal.
- [ ] Remove all ESLint warnings without broad disabling rules.
- [ ] Run `lint`, deterministic, live safety, E2E, regression, and build.

### Task 4: Moderation false-positive evidence and release gate

**Files:**
- Modify: `scripts/measure-falsepos.mjs`
- Modify: `docs/RELEASE-AUDIT-CONTINUATION-2026-07-18.md`

- [ ] Add fixed safe/unsafe corpus labels and a non-zero exit for an unsafe false-allow or a safe false-reject above the declared threshold.
- [ ] Run the corpus repeatedly against the configured live classifiers; record only aggregate outcomes and category codes, never raw child-like test content in production logs.
- [ ] If the configured provider keeps rejecting safe lesson text, retain fail-closed moderation and use the lesson-specific safe fallback rather than weakening the classifier without a signed safety decision.
- [ ] Update the release document with fresh evidence and the remaining external requirements: real Clerk family test, production secret validation, and legal approval.

### Task 5: Release verification

- [ ] Run `npm run lint` with zero warnings/errors.
- [ ] Run `npm test`, `node tests/live-safety-startup.test.mjs`, `npm run test:live`, `npm run test:e2e`, `npm run test:regression`, and `npm run build`.
- [ ] Inspect `git diff --check`, test result summaries, and no stale local test server ports.
- [ ] Do not claim public launch approval without the externally-owned Clerk, production-secret, and legal evidence.
