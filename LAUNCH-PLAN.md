# MindShift Academy — Launch Plan (no payment · referral access · 5 modules)

**Date:** 2026-06-26 · **Owner:** Cowork-Atlas (per CEO directive) · **Repo:** `C:\Projects\mindshift-academy`
**Rule:** no junk actions. Each step is shippable on its own and verified before the next.

---

## Current state (verified this session)

- **Stack is real:** Next 16, React 19, Clerk auth, Prisma 7 (libsql + better-sqlite3), OpenAI/NVIDIA (`ai-provider.ts`), Upstash rate-limit, Resend, Framer Motion, Lottie, Zustand, Zod.
- **Routes:** landing (`/`), `sign-in`, `sign-up` (Clerk), `onboarding`, `dashboard`, `lesson/[id]`.
- **5 modules already exist as data** in `src/lib/curriculum.ts`: 1 Пробуждение · 2 Эмоциональный Спектр · 3 Тайный Язык · 4 Машинное Зрение · 5 Арена Промптов. Content exists; end-to-end play does not.
- **API (12 routes):** chat, monster, user, reset, generate-silhouette, tts, gacha/claim, parent/reward-crystals, cron/mood-decay, cron/weekly-report, **checkout (PAYMENT)**, **webhooks/lemonsqueezy (PAYMENT)**.
- **Payment to remove:** `@lemonsqueezy/lemonsqueezy.js` dep + `api/checkout` + `api/webhooks/lemonsqueezy` + `.agents/skills/mindshift-lemonsqueezy`.

## "Launched" means (acceptance)
1. A child opens a **referral link** → access only for **the single account you approve** → completes **all 5 modules** start-to-finish → gets the monster card. **No payment anywhere.**
2. **One coherent, calm, kid-safe design** (current one is inconsistent).
3. Runs **end-to-end in prod** with no dead ends.

## Sequence (6 steps, no junk)

**Step 1 — Strip payment (delete, not hide).** Remove `api/checkout`, `api/webhooks/lemonsqueezy`, the `@lemonsqueezy` dependency, the `mindshift-lemonsqueezy` skill, and any checkout/upsell CTA in the UI. *Done when:* `grep -ri lemonsqueezy\|checkout src` = 0 and build passes.

**Step 2 — Access model: referral link + allowlist (one account).** Add an invite/referral token + an allowlist (the email(s) you approve) checked in `middleware.ts`; everyone else sees a "request access" screen. Referral link carries the token. *Done when:* only the approved account passes; the link grants access; nobody else can register in.

**Step 3 — Make all 5 modules work end-to-end.** Wire `lesson/[id]` to all 5 `curriculum.ts` entries: success-conditions fire, rewards persist, progression unlocks 1→5. Module 4 (vision) needs an image-input path or a graceful text-only fallback; module 5 (boss) needs the HP / prompt-complexity loop. *Done when:* a fresh account completes 1→5 and reaches the final card.

**Step 4 — AI/image reality.** Confirm `ai-provider.ts` (NVIDIA) drives chat + monster/silhouette. If there is no OpenAI key, ship the NVIDIA/SVG path and remove any "DALL-E"/"gpt-image" wording from the UI so we don't promise what doesn't run. *Done when:* the monster card renders on a real run.

**Step 5 — Redesign pass (calm, kid-safe, one language).** One dark, friendly theme; shame-free copy; one primary action per screen; skeletons not spinners; consistent type/spacing across landing, onboarding, lesson, dashboard. *Done when:* the four screens read as one product.

**Step 6 — End-to-end smoke + ship.** Walk the golden path in a browser, fix dead ends, deploy. *Done when:* the referral link → 5 modules → card path works in prod.

## Delete / park list
- **Delete now:** `api/checkout`, `api/webhooks/lemonsqueezy`, `@lemonsqueezy` dep, `mindshift-lemonsqueezy` skill.
- **Decide (keep only if they serve the free referral launch):** `gacha/claim`, `parent/reward-crystals`, `cron/weekly-report`. Park if not.
- **Clean:** any dev/temp cruft carried from the Antigravity fork; rename `package.json` "name" from `mindshift-mvp` → `mindshift-academy`.

## Ownership (anti-fork — important)
`atlas-academy-overseer` (Claude Code) is mid-Sprint-1 in **this same repo**. Two bodies editing one repo in parallel re-introduced defects on 2026-06-13. **One owner only.** Cowork-Atlas owns: this plan, the access model, the redesign, the curriculum wiring, and the safe deletions — done on a branch. The **live build + end-to-end run + deploy** should execute where the env lives (Clerk keys, dev server, AI keys) — i.e. the Code-Atlas / Claude Code lane — merging the branch once green.

## Run it (exact)
PowerShell → `cd C:\Projects\mindshift-academy` → start Claude Code → paste:
`Execute LAUNCH-PLAN.md Steps 1–2 now: remove ALL payment (lemonsqueezy/checkout/webhook/dep/skill), add referral-token + allowlist access in middleware so only my approved account gets in. Report receipts (grep proves payment gone, build passes).`
