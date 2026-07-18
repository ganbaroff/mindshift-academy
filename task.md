# MindShift Academy — HONEST status

> Rewritten 2026-07-10 by Atlas to replace the earlier "Phase 6 100% / all DONE / 16 checks passed"
> claims, which were overreach: the "16 checks" are the moderation-classifier unit tests
> (`tests/safety.test.mjs`), NOT the 5-lesson loop. The real per-lesson end-to-end was only ever
> proven for lesson 2. "Done" is now defined by `node scripts/regression.mjs` going green, not by
> a human clicking the live site.

## Definition of done (executable)
`node scripts/regression.mjs` — deterministic (non-LLM) cases must be 100% green; LLM-lane cases
depend on NVIDIA being up. As of 2026-07-10: deterministic cases GREEN; LLM lane blocked/flaky
(see "Blocked" below).

## Genuinely done + regression-locked (proven, not narrated)
- State ownership: server-authoritative progression, URL-derived view. `/api/user` returns
  progression; client rebuilds `completedLessons` from server truth (no more client-only ledger).
  Cures: persona-mismatch, replay "выполнено" modal, cross-device relock, backward-nav relock.
  Proof: regression STATE(a/b/c) + persona-for-viewed L1..L5 green.
- Tutor persona keyed to the VIEWED lesson (URL), not server progress. Reward gated on
  serverStep===activeStep (anti XP-farm). Proof: L#c cases green; call site route.ts ~L347/423.
- Safety moderation UNTOUCHED (llama-guard + kidNet, fail-closed). Proof: `git diff moderation.ts` empty.
- Lesson themes rewritten so correct answers no longer trip the safety filter:
  L2 roar→friendly style (пой/огонёк 🔥), L5 battle→friendly maze/puzzle (IF/THEN), L3 cipher cleaned.
  Proof: llama-guard rates all rewritten answers "safe" (scripts/check-guard.mjs); grep shows no
  active violence terms remain (only a history comment).
- Design/a11y pass (focus rings, aria, reduced-motion, no red) across ~28 components. Deployed.

## Blocked — NOT done (and why)
- **Live child chat is DOWN when NVIDIA 8b flaps.** Moderation's kidNet runs on
  meta/llama-3.1-8b-instruct (70b is unreachable on this free tier). When 8b times out, moderation
  fail-closes (correct for kids) → every message blocked. Even when up, the weak 8b intermittently
  false-flags clean answers (e.g. L3 cipher → "непонятное"). **CEO decision:** move off the flaky
  free tier (NVIDIA Inception / Vertex / Azure) or a reliable model + DPA. Code cannot fix this
  without weakening the child-safety filter.
- **COPPA consent: 0% in code.** On the live (allowlist-gated) site, a signed-in child's free-text
  egresses to NVIDIA with NO parental-consent gate (only comments + data-minimization). Critical
  launch-blocker the moment a real family email is added to ALLOWLIST_EMAILS. **CEO decision:**
  choose + authorize the verifiable-consent flow + sign the NVIDIA (LLM) DPA.

## Known in-lane bugs to fix next (not yet done)
- Double-submit reward dedup is CLIENT-ONLY (sendingRef). Server dedupes by eventId PK, not by
  (userId, stepId) — two rapid distinct-eventId completions before activeStep advances could
  double-award. Fix: server guard on (userId, stepId) or a unique constraint (needs a migration).
- STATUS.md was stale (HEAD f6ab39e); superseded by this file. Legacy audit/plan .md docs remain.
- x-test-bypass dev auth bypass in chat + generate-silhouette routes: inert in prod
  (NODE_ENV gate), but remove before any real-user launch.

## Not in this repo (tracked elsewhere)
- The marketing FUNNEL + payments (Dodo checkout, Telegram bot) live in the separate Supabase
  project `awfoqycoltvhamtrsvxk`, NOT this codebase — its state is not represented here.
