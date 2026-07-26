# MindShift Academy — production release record

**Date:** 2026-07-24  
**Engineering verdict:** **TECHNICAL GO**  
**Canonical public URL:** https://academy.volaura.app

## Published deployment

- Vercel production deployment: `dpl_5xbYhC8z2ygxpUHB4KYzodmrfrVb`
- Vercel reported `READY` and aliased the deployment to `academy.volaura.app`.
- The temporary Vercel deployment URL is not the public sharing URL; use the canonical URL above.

## Release evidence

`npm run verify:release` passed on the release candidate on 2026-07-24 after the Azure tutor migration,
the additive parent-access implementation and the parent-first UX update. Its completed gates include:

- `npm audit --omit=dev --audit-level=high`: 0 production vulnerabilities.
- ESLint, TypeScript and the Next.js production build.
- consent and child-data lifecycle tests, including revoke, version expiry, verification-code replay protection and permanent deletion.
- anonymous 401 protection for all 11 private Academy APIs.
- live safety: 17/17 (unsafe Russian, English, transliterated and Azerbaijani inputs blocked; harmless city and lesson inputs pass).
- false-reject corpus: 0/20 harmless inputs rejected; 0/6 unsafe inputs allowed.
- full five-lesson browser paths in Chromium, Firefox and WebKit.
- Azure GPT tutor/judge lesson regression: 22/22 passed; correct answers earned the intended reward, incorrect answers did not.
- production build completed in Vercel and the deployment was aliased to the canonical URL.

## Azure tutor migration and consent

- Microsoft Azure OpenAI (`gpt-4o` deployment) now supplies the child-facing tutor and lesson judge.
- NVIDIA Llama Guard and Google Gemini remain an independent input/output safety layer; Azure is never the sole safety decision-maker.
- Tutor calls are bounded to 150 output tokens, lesson-judge calls to 120 tokens, with zero SDK retries.
- The consent version is now `2026-07-24`. Existing parent consent is intentionally stale and the parent must review and re-confirm the updated provider disclosure before a child can use the AI path.

## Parent entry and access operation

- Production accepts both the legacy bulk `ALLOWLIST_EMAILS` and independent additive
  `ACADEMY_ALLOW_EMAIL_<SHA256(email)>=1` grants. Adding a family no longer requires reading or
  overwriting the existing bulk list.
- The owner’s requested parent grant was added as an active production variable before this
  deployment. The release record deliberately does not store the raw email address.
- Registration and sign-in now continue to `/consent`; anonymous visitors are redirected to
  `/sign-in`, and a signed-in but unapproved account is redirected to `/no-access`.
- Consent verification is bound to the parent’s signed-in Clerk email. The code request and code
  verification APIs reject a signed-in, non-allowlisted account with HTTP 403.
- The reusable operator procedure is documented in
  [PARENT-ACCESS-RUNBOOK.md](PARENT-ACCESS-RUNBOOK.md).

## Parent-first UX update

- The first screen now displays two explicit, separate routes: **«Я родитель — открыть доступ»**
  and **«У ребёнка есть код»**. The parent route is the visual primary action.
- The family’s three-step sequence is visible above the fold on desktop and mobile.
- The silhouette preview is clearly labelled as an optional, local introduction and appears below
  the entry choices. Its completion now leads only to code entry, never directly to onboarding.

## Post-deploy production canaries

- `/`, `/sign-in`, `/sign-up`, `/enter-code` and `/no-access` returned HTTP 200.
- An anonymous visit to `/consent` returned HTTP 307 to `/sign-in`, proving the parent-only
  boundary is server-enforced before the consent form renders.
- Private `/api/user`, `/api/chat` and `/api/consent/request-code` returned anonymous HTTP 401.
- The deployed home HTML contains both primary entry labels, and browser inspection verified that
  the two actions remain visible and distinct at a 390px mobile viewport.
- `/api/generate-silhouette` returned HTTP 200 with the neutral, deterministic description
  `Вот предварительный силуэт будущего персонажа.` and did not echo dangerous input words.
- A 7-request harmless silhouette burst returned `200,200,200,200,200,200,429`, proving the live public rate limit is active.
- Production sign-in was checked in a browser: Clerk headings and access explanation are Russian and identify the parent area; no browser console errors were recorded.

## Safety availability decision

NVIDIA Llama Guard remains the preferred primary classifier. During this release it was observed timing out. The application now makes one bounded NVIDIA attempt, then uses a strict Gemini primary safety classifier and kidNet together. Both must return valid `unsafe: boolean` JSON and both must be safe; malformed results, errors and unsafe results fail closed. A five-minute per-client outage cooldown prevents the unavailable NVIDIA service from delaying the output safety check again. This behavior is covered by deterministic tests and independent code review.

## Scope boundary

This is an engineering release approval, not legal advice or a legal approval of COPPA/GDPR-K copy. The consent implementation, Resend/Clerk/Cloudflare production configuration and technical gates were verified, but a qualified owner or counsel remains responsible for any jurisdiction-specific privacy and terms review before broad under-13 distribution. Historical handover files dated 2026-07-18 describe earlier, resolved infrastructure work; this record is authoritative for the 2026-07-24 deployment.
