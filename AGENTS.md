> Rewritten 2026-08-04 from repo audit (previous file was unedited Next.js scaffold). Verified against commit `e266b8a`, branch `docs/closed-test-audit-grill`.

## 1. What this is

MindShift Academy is a Next.js EdTech app for children (~8-14) that teaches prompt engineering through
an AI-companion-monster mechanic (Clerk auth, per-child progression, Azure/NVIDIA-backed tutor+judge,
fail-closed safety moderation). It is in **closed-pilot hardening**, not public launch: a wave-based
security/a11y/consent audit (`docs/release/W0..W5-RECEIPT-2026-07-31.md`) has been landing since late
July, and the HEAD commit today closed five more security findings. Remote exists
(`github.com/ganbaroff/mindshift-academy`); current branch is a docs/audit branch, not `main`.
Working tree has 3 uncommitted doc changes as of this audit (`git status --short`) — check before
assuming a clean tree.

## 2. Stack (exact, from `package.json`)

Next.js **16.2.12** (major version, breaking changes vs pre-16 — check `node_modules/next/dist/docs/`
before writing routing/caching code), React 19.2.4 / react-dom 19.2.4, Prisma **7.9.1** + `@prisma/client`
7.9.1 (datasource provider = `sqlite` per `prisma/schema.prisma`, adapters for both better-sqlite3 and
libsql — so "sqlite" here likely means Turso/libSQL in prod, not a flat file), `@clerk/nextjs` ^7.5.7,
`@clerk/backend` 3.8.2, Tailwind ^4 (CSS-first config), Zod ^4.4.3, `openai` ^6.44.0 SDK (used for an
Azure-compatible endpoint per release notes, not necessarily OpenAI directly — verify in
`src/lib/ai-provider.ts` before assuming vendor), Zustand ^5, TypeScript ^5, Playwright ^1.61 (test-only
dependency).

## 3. Doc map — canonical vs superseded

The root now holds only `AGENTS.md`, `CLAUDE.md` and `README.md`. The eight June/early-July
planning files that used to sit there moved to `docs/archive/planning-2026-06-07/` on 2026-08-04
(see that folder's README): they described a product that no longer exists and were read first
precisely because they were in the root. **Nothing in that archive states current fact.**

**Canonical (read these for current state):**
- `docs/canon/MINDSHIFT-PRODUCT-CANON-V1.md` — product canon, source of truth for intended behavior.
- `docs/release/MINDSHIFT-PILOT-READINESS.md` (31.07.2026) — single disposition list for every open
  defect; supersedes the raw audit it dispositions.
- `docs/PREMIERE-AUDIT-2026-07-29.md` — the 69-finding audit that PILOT-READINESS dispositions.
- `docs/RELEASE-STATUS-2026-07-24.md` — last verified production release record (Azure GPT-4o tutor,
  canonical URL `academy.volaura.app`).
- `docs/release/W0..W5-RECEIPT-2026-07-31.md` — wave-by-wave execution receipts for pilot hardening.
- `docs/COPPA-CONSENT-SPEC.md` — consent design; now implemented in code (see §5).

**Superseded — all under `docs/archive/planning-2026-06-07/`, historical only, never cite as current fact:**
- `task.md`, `HANDOFF.md` (2026-06-23, Antigravity handoff) — obsolete pivot narrative, pre-dates the
  current curriculum/session model.
- `LAUNCH-PLAN.md` (2026-06-26) — "no-payment, 5-module referral launch" plan; the 5-lesson path it
  describes is now the **legacy, flag-disabled** flow (see §5).
- `REBUILD-PLAN-2026-07-04.md`, `AUDIT-FINDINGS-2026-07-04.md` — this audit's claims of "COPPA 0% in
  code" and "no migration history" are **no longer true** (verified below); superseded by
  `PREMIERE-AUDIT-2026-07-29.md` + `MINDSHIFT-PILOT-READINESS.md`.
- `DEV-PLAN-2026-07-06.md`, `AGENT-HANDOFF-2026-07-06.md` — superseded by `docs/canon/` + `docs/release/`.
- `CEO-DECISIONS.md` (2026-07-10) — flagged two CEO gates (reliable LLM provider, COPPA method). Both
  now appear resolved in code/prod (Azure tutor per `RELEASE-STATUS-2026-07-24.md`; consent code
  shipped, §5) but this pass did not re-verify the live provider end-to-end — confirm before relying
  on this doc.

## 4. Commands (from `package.json` scripts, UNTESTED unless noted)

- `npm run dev` / `npm run build` (`prisma generate && next build`) / `npm start` — UNTESTED this pass.
- `npm test` — chains 9 deterministic + tsx test files. UNTESTED this pass.
- `npm run verify:release` — the full release gate: audit, lint, prod-env contract, UI, all unit/e2e
  suites (Chromium/Firefox/WebKit), regression, then `build`. Long-running; UNTESTED this pass.
- Individual `test:*` scripts exist per feature (`test:consent`, `test:data-lifecycle`, `test:e2e`,
  `test:crystals`, `test:parent-journey`, etc.) — see `package.json` for the full list before writing
  a new one; one may already cover it.
- `npm run check:prod-env` — validates required prod env vars (now folded into `verify:release`).

## 5. Confirmed-on-disk facts (this pass, not copied from planning docs)

- **Lesson-2 persona/rubric contradiction ("солнце" vs "рычи"): FIXED at the source.**
  `src/lib/curriculum.ts:1-4` now states it is the single source of truth — persona (`systemPrompt`)
  and judge rubric live in one object specifically because the old split caused that bug. The legacy
  per-lesson UI (`src/app/lesson/[id]/page.tsx`) still exists on disk but is **disabled by default**:
  `src/proxy.ts:28` gates it behind `LEGACY_MODULE1_ENABLED === "1"` or `E2E_LEGACY_LESSONS` — both
  must stay unset/non-"1" in production or the old un-synced surfaces come back.
- **COPPA parental consent: in code, not spec-only.** `prisma/schema.prisma:90` (`ParentalConsent`) and
  `:109` (`ConsentVerification`) exist; `src/lib/consent.ts` implements a fail-closed resolver
  (`hasValidConsent`) plus code issue/verify/record/revoke, wired into
  `src/app/api/consent/verify/route.ts`, `src/app/api/monster/route.ts`, `src/app/api/tts/route.ts`,
  `src/app/onboarding/page.tsx`, `src/lib/child-data.ts`, `src/lib/silhouette.ts`. This directly
  contradicts the older `AUDIT-FINDINGS-2026-07-04.md` claim of "0% in code" — that claim is stale.
- **Migration history exists.** `prisma/migrations/` has 4 real migrations
  (`0000_baseline` .. `0003_w6_access_request`) — the old "no migration baseline" P0 claim is stale.
- Today's HEAD (`e266b8a`) closed 5 security findings: prod-fail-open `CONSENT_CODE_PEPPER` default,
  an unthrottled paid classifier route, a response-timing oracle on `/api/access-request`, a shell-
  metacharacter hole in an email validator, and a referrer-leaking activation-token URL. Full detail
  in the commit body — read it before assuming any of those five are still open.

Anything from `docs/release/MINDSHIFT-PILOT-READINESS.md`'s open-defect table (§2.2-2.5 there) is
**not re-verified in this pass** — that doc is 4 days old as of today and 2+ commits have landed since;
re-check the live file/line before citing a specific item as still open.

## 6. Owner-only decisions (not an agent's call)

- **COPPA/legal sign-off for public launch** (as opposed to closed pilot) — vendor DPA, privacy-policy
  page, human lawyer review. Engineering implemented the consent *mechanism*; it does not substitute
  for the legal sign-off `CEO-DECISIONS.md` describes.
- **Production credential / key rotation** and any secret provisioning — per this user's global
  operating rules, secrets are never read into or pasted through chat by an agent.
- **Any prod deploy or prod DB write** — this pass did zero installs/builds/network calls; do not
  infer deploy status beyond what `docs/RELEASE-STATUS-2026-07-24.md` states.

## 7. Red lines

- No secrets (API keys, Clerk/Azure/NVIDIA credentials, `CONSENT_CODE_PEPPER`, DB URLs) in chat output
  or committed to the repo — read by name/existence only.
- No production database writes, no deploys, no `git push` to `main`/prod, without explicit owner
  approval in the current conversation.
- Do not re-enable `LEGACY_MODULE1_ENABLED` / `E2E_LEGACY_LESSONS` in any prod-facing config without
  understanding why they were turned off (§5).
- Do not cite root-level planning `.md` files as current state — check `docs/canon/` and
  `docs/release/` first (§3).
