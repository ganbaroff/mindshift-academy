# W4-FIX receipt — 2026-07-31

## Verdict
**PASS.** W4 receipt claim “Zero U+FFFD/mojibake PASS” was falsified by ASCII `???` corruption (not U+FFFD). Fixed; scanners and token/send gates strengthened.

## Corrupted strings
| Metric | Count |
|--------|------:|
| Before (JSON `error: "…"` literals with `???` runs across 18 API routes) | **48** |
| After | **0** |

Root cause: wrong-encoding write in `93862b4`. Repair routes all calm RU through `src/lib/errors.ts` (Cyrillic U+0400–U+04FF verified on read-back).

## Scanner patch (`src/lib/mojibake.ts`)
- Added `extractStringLiterals`
- `findMojibake` now also flags **`ascii-question-corruption`** when a string literal contains **3+ consecutive `?`**
- Surface scan includes `src/app/api` + `src/lib/errors.ts` + chat components so this class cannot go green again

## P0-10 send button
- `PromptInput` send control: solid `bg-[var(--color-primary)]` — **no** `bg-gradient` / `from-*` / `to-*`
- Amber gradient CTA (“Оживить…”) also converted to solid primary
- Test asserts **no gradient classes** on the send button (not merely “no cyan”)

## P0-15/16 tokens
- Replaced hardcoded `#090d16` in certificate, Header, session (7) → `bg-[var(--color-bg-base)]`
- Also replaced leftover `bg-[#070b14]` in lesson + onboarding
- Test: **zero** `#090d16` / `#070b14` under `src/app` + `src/components` outside token def / emails / `layout.tsx` themeColor

## Gates
- `npm run lint` → exit 0
- `npm test` → exit 0 (deterministic 72 + tasks 27 + fixtures + mastery 34 + W2 38 + W3 52 + W4 drills 42 + a11y 18 + session matrix 96)

## Scope (complete)
- `src/lib/errors.ts` (+ `noConsentToRevoke`)
- `src/lib/mojibake.ts`
- `src/app/api/access-code/redeem/route.ts`
- `src/app/api/access-code/activate/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/monster/route.ts`
- `src/app/api/tts/route.ts`
- `src/app/api/consent/verify/route.ts`
- `src/app/api/consent/request-code/route.ts`
- `src/app/api/consent/revoke/route.ts`
- `src/app/api/consent/status/route.ts`
- `src/app/api/learning/decide/route.ts`
- `src/app/api/learning/outcome/route.ts`
- `src/app/api/cron/mood-decay/route.ts`
- `src/app/api/cron/weekly-report/route.ts`
- `src/app/api/formulation/submit/route.ts`
- `src/app/api/generate-silhouette/route.ts`
- `src/app/api/reset/route.ts`
- `src/app/api/user/route.ts`
- `src/app/api/child-data/route.ts`
- `src/components/chat/PromptInput.tsx`
- `src/components/layout/Header.tsx`
- `src/app/certificate/page.tsx`
- `src/app/session/[id]/page.tsx`
- `src/app/lesson/[id]/page.tsx`
- `src/app/onboarding/page.tsx`
- `tests/w4-ai-safety.test.mjs`
- `scripts/w4-fix-mojibake-api.mjs`
- `scripts/w4-verify-api-cyrillic.mjs`
- `docs/release/W4-FIX-RECEIPT-2026-07-31.md` (this file)

## Not done
- W5 not started
- No deploy / push / prod / secrets / child invites

## Next safe wave
**W5** (live HTTP choice-mode / additive DB tables remain a known non-blocking note from W4; not a W4-FIX blocker).
