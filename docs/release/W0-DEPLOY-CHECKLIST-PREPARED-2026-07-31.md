# W0 Deploy Checklist — PREPARED ONLY (do not execute)

**Status:** prepared in W0 · **execution forbidden** without direct CEO approval (red gate 10).  
**Date:** 2026-07-31.

## Pre-flight (read-only)

- [ ] Confirm `academy.volaura.app` and `mindshift-academy-three.vercel.app` still byte-identical (or document intentional split).
- [ ] Anonymous `GET /session/w1-s1` still 307 (auth gate).
- [ ] **Prod Turso schema receipt (READ-ONLY):** list tables/columns; confirm `TaskAttempt`, `ConceptMastery`, `AccessCode`, `ParentalConsent` exist. If missing → **STOP** — additive migration plan required (never apply `0000_baseline` to non-empty).
- [ ] Clerk keys on Vercel: confirm live vs test; no secrets in chat.
- [ ] Resend domain status for consent email.
- [ ] Consent screen live copy: vendors named (Azure OpenAI tutor/judge path, NVIDIA safety / Llama Guard naming decision, Google Gemini). Compare to local `src/app/consent/page.tsx` version.
- [ ] Env flags: `LEGACY_MODULE1_ENABLED` and `E2E_LEGACY_LESSONS` must **not** be `"1"` on prod.
- [ ] Kill-switch / missing-provider behavior: prod chat without client → 503 (local HEAD); verify after deploy.

## Apply order (CEO-gated — do not run in W0)

1. Merge/push only after CEO word (red gate 11).
2. Additive migrations only, after live schema receipt + isolated rehearsal + rollback transcript.
3. Deploy Vercel production.
4. Smoke: consent → activate code → redeem → `/session/w1-s1` (synthetic fixtures only; no real children).
5. Confirm both hosts serve new deployment SHA.
6. Monitor degrade/fallback paths (Lane-4 metrics land in later waves).

## Explicitly out of scope for this checklist execution in W0

No deploy, no push, no prod DB writes, no secret access, no family invites.
