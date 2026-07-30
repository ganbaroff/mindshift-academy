# MindShift Academy — Consolidated Premiere Audit
**Date:** 2026-07-29
**Scope:** 6 independent auditors, 366 raw findings, deduplicated to 69 actionable defects
**Status:** PRE-PREMIERE — do not share with families until all P0 items are resolved

---

## Executive Summary

| Priority | Count | Gate |
|----------|-------|------|
| P0 | 20 | Must fix before any family sees the product |
| P1 | 30 | Must fix before closed test with families |
| P2 | 19 | Fix before public premiere |
| **Total** | **69** | |

### Top 5 Systemic Problems (each generates 5–15 individual defects)

1. **No consent gate on API routes** — learning, gacha, and dashboard routes bypass COPPA consent checks entirely. One missing gate means a child with revoked consent can still earn rewards, study, and send text to LLMs.
2. **No design token system** — 4 "black" hex values, 17 unique shadow definitions, 14 opacity levels, non-8px spacing, and mixed border radii are symptoms of the same root: no shared token file. Fixing tokens fixes 30+ visual defects in one pass.
3. **No atomic transactions on state-mutating operations** — consent erasure, gacha claims, reward pipeline, and monster creation all have TOCTOU races because each uses separate Prisma calls instead of `$transaction`. Any concurrent request can corrupt state.
4. **All API error messages are in English** — the app is Russian-only for children aged 8–14. Every `catch` block surfaces English stack-trace text to the child.
5. **No middleware.ts** — auth relies on per-layout server components. One missed layout exposes the route. A single `middleware.ts` with a route matcher closes every open route simultaneously.

---

## Full Defect Table

### P0 — Blocks Closed Test

| ID | Category | Screen | What's Wrong | File:Line | Fix |
|----|----------|--------|--------------|-----------|-----|
| P0-01 | Security/COPPA | All | AccessCode rows NOT deleted on COPPA erasure — ghost code can mint a new session for a deleted user | `src/lib/child-data.ts:36-56` | Add `deleteMany({ where: { parentId } })` for AccessCode inside the erasure `$transaction` |
| P0-02 | Security/COPPA | Consent flow | Concurrent correct access codes both return `ok:true` — two sessions created for one erasure | `src/lib/consent.ts:162-198` | Wrap check-and-mark in `prisma.$transaction` with `findUnique`-for-update pattern |
| P0-03 | Security/Data | Infra | Zero migration history — all schema applied via `db push`, no rollback path | `prisma/` | Run `prisma migrate dev --name init` to snapshot current state; commit migrations directory |
| P0-04 | Security/COPPA | API | `/api/learning/decide` and `/api/learning/outcome` have no consent gate and no rate limit | `src/app/api/learning/` | Add consent check + `rateLimit()` as first middleware in both route handlers |
| P0-05 | Security/COPPA | API | `/api/gacha/claim` has no consent gate — child claims rewards after consent is revoked | `src/app/api/gacha/claim/route.ts` | Add consent verification before any reward logic |
| P0-06 | Security/AI | Chat | Simulated chat mode skips ALL moderation when API keys are absent | `src/app/api/chat/route.ts:201-274` | Moderation must run regardless of provider; throw 503 rather than silently skipping |
| P0-07 | Security/Auth | API | Client-supplied `learnerId` on learning routes — spoofable, no server-side binding to session | `src/app/api/learning/outcome/route.ts:56` | Derive `learnerId` from authenticated session server-side; reject any client-supplied value |
| P0-08 | Legal/COPPA | Consent screen | Consent text missing: data retention period, right-to-refuse statement, TTS/audio disclosure | Consent UI component | Add three disclosure paragraphs per COPPA spec (`docs/COPPA-CONSENT-SPEC.md`) |
| P0-09 | Accessibility | All primary CTAs | White on violet-500 contrast = 4.23:1, fails WCAG AA (requires 4.5:1) | Tailwind config / button component | Darken to violet-600 or adjust text; verify with browser contrast tool |
| P0-10 | Accessibility | Chat | Gradient send button cyan end = 2.43:1 contrast — catastrophic failure | `PromptInput` component:345 | Replace gradient with solid compliant color; minimum 4.5:1 |
| P0-11 | UX/Haptics | All | Zero haptic feedback anywhere in the app — every interaction feels dead on mobile | App-wide | Add `navigator.vibrate()` calls (short pulse for tap, pattern for reward) behind feature-detect |
| P0-12 | UX/Audio | Session | `fail.wav` asset exists but is never triggered on wrong answer | Session page component | Wire `new Audio('/fail.wav').play()` in the wrong-answer branch |
| P0-13 | UX/Interaction | All | No `active:` pressed state on any button — every tap gives zero physical feedback | Global button styles | Add `active:scale-95 active:brightness-90` to base button class |
| P0-14 | UX/Layout | Lesson + Reward | Lesson splash z-110 renders over reward modal z-100 — reward is hidden | Lesson page + reward modal | Audit z-index stack; set reward modal to z-200, lesson splash to z-50 |
| P0-15 | Visual/Tokens | All | 14 different text-white opacity levels — visual chaos, no hierarchy | App-wide | Define 3 opacity tokens (primary/secondary/muted); find-replace all inline opacities |
| P0-16 | Visual/Tokens | All | 4 different hex values for "black" background (#070b14, #090d16, #0b1020, #11182a) | App-wide | Define `--color-bg-base` token; replace all four hex values |
| P0-17 | Content/i18n | All API routes | 44 API error messages in English in a Russian-only app | Every API route `catch` block | Create `src/lib/errors.ts` with Russian error strings; replace all English user-facing strings |
| P0-18 | Content/i18n | Chat | Error message reads "Убедись, что Next.js работает!" — shown to a child | `src/app/api/chat/` error handler | Replace with child-friendly Russian: "Что-то пошло не так. Попробуй ещё раз!" |
| P0-19 | Content/UX | Onboarding | Onboarding describes "3 характеристики" but routes to grid-drawing session — contradiction | Onboarding copy + routing | Align copy to the actual flow, or fix routing to match the described flow |
| P0-20 | Content/i18n | Weekly email | Weekly report sends Azerbaijani greeting "Hörmətli valideyn" to all Russian parents | Email template | Replace with "Уважаемый родитель" everywhere; audit template for additional non-Russian strings |

---

### P1 — Visible to Families

| ID | Category | Screen | What's Wrong | File:Line | Fix |
|----|----------|--------|--------------|-----------|-----|
| P1-01 | Security/Auth | All routes | No `middleware.ts` — auth relies on per-layout gates; one missed layout = open route | `src/middleware.ts` (missing) | Create `middleware.ts` with route matcher covering `/dashboard`, `/session`, `/api/` |
| P1-02 | Security/Auth | Dashboard | Dashboard has no consent check — child without consent reaches parent panel | Dashboard layout | Add consent status check in dashboard layout server component |
| P1-03 | Security/Data | Reward pipeline | Crash between guards permanently burns idempotency key without awarding the reward | Reward pipeline | Wrap entire pipeline in `$transaction`; only commit idempotency key after reward is written |
| P1-04 | Security/Race | Gacha | Gacha daily claim TOCTOU — two concurrent claims both award | `src/app/api/gacha/claim/route.ts` | Use `$transaction` with `findUnique`-for-update on the daily-claim record |
| P1-05 | Security/Race | First visit | Concurrent first-visit can create two User rows | User creation path | Add `upsert` or unique-constraint-catch; do not use `findFirst` + `create` pattern |
| P1-06 | Security/COPPA | Admin | No COPPA deletion audit log | Delete flow | Write to `AuditLog` table (userId, action, timestamp, requestedBy) on every erasure |
| P1-07 | Security/Auth | Activation | Activation token endpoint reveals parent emails via enumeration; no rate limit | `src/app/api/activate/route.ts` | Return identical 200 response for valid/invalid tokens; add rate limit |
| P1-08 | Security/COPPA | AI calls | `minimizeChildText` strips only emails/phones — names and addresses still sent to LLMs | `src/lib/coppa.ts` | Extend pattern list; consider NER-based approach or flag for manual review |
| P1-09 | Accessibility | All | Missing skip-to-content link — keyboard users cannot bypass nav | Root layout | Add `<a href="#main-content" className="sr-only focus:not-sr-only">Перейти к содержимому</a>` |
| P1-10 | Accessibility | Reward modal | Reward modal focus not trapped — Tab key escapes to background content | Reward modal component | Use `focus-trap-react` or implement `aria-modal` + manual tab intercept |
| P1-11 | Accessibility | Monster card | MonsterAvatar Lottie invisible to screen readers — no role or aria-label | `MonsterAvatar` component | Add `role="img" aria-label={`Монстр ${monster.name}`}` to wrapper |
| P1-12 | UX/Animation | Navigation | No page transitions — navigation flashes white between routes | Root layout | Add `framer-motion` `AnimatePresence` wrapper or CSS view-transition API |
| P1-13 | UX/Loading | Session | Full-page spinner with no skeleton during session load | Session page | Replace spinner with content skeleton matching session card layout |
| P1-14 | Performance | All | All Lottie files loaded statically (206 KB) even when only one mood is needed | Lottie loader | Dynamic import by mood key; load only the required JSON |
| P1-15 | UX/Audio | All | Ambient sound loops never cleaned up on navigation — stacks audio instances | Audio hooks | Return cleanup function from `useEffect`; call `audio.pause(); audio.src = ''` on unmount |
| P1-16 | UX/Audio | Session | No mute button on session page; mute state not persisted across page loads | Session page | Add mute toggle; persist to `localStorage` under `mindshift_mute` key |
| P1-17 | Accessibility | All spinners | 4 spinners missing `motion-reduce:animate-none` — forced animation for vestibular users | Spinner components | Add `motion-reduce:animate-none` to every `animate-spin` usage |
| P1-18 | Browser/iOS | Inputs | iOS Safari auto-zooms on both input areas — font-size below 16px triggers viewport zoom | Input components | Set `font-size: 16px` minimum on all inputs; override with `touch-action: manipulation` |
| P1-19 | Visual/Type | All | Sub-12px text (text-[9px], text-[10px], text-[11px]) — unreadable for target age 8–14 | App-wide | Minimum 14px (text-sm) for all visible text; 16px for interactive elements |
| P1-20 | Visual/Tokens | All | Non-standard border radii (18/20/28px) — not aligned to any radius scale | App-wide | Define 4 radius tokens (sm/md/lg/xl); replace custom values |
| P1-21 | Visual/Spacing | All | Card padding chaos — p-3, p-4, p-5, p-6 mixed with no rule | Card components | Define card padding token (p-4 default, p-6 large); apply consistently |
| P1-22 | Accessibility | Touch | Consent and gacha buttons below 44px touch target — WCAG 2.5.5 failure | Consent + gacha components | Minimum `min-h-[44px] min-w-[44px]` on all interactive elements |
| P1-23 | Visual/Tokens | All | 17 unique hardcoded shadow values — no token system | App-wide | Define 3 shadow tokens (sm/md/lg); replace all 17 values |
| P1-24 | Content/i18n | Gacha | "Crystals" in English in gacha calendar | Gacha calendar component | Replace with "Кристаллы" |
| P1-25 | Content/i18n | Dashboard | Demo lesson titles in English on dashboard | Dashboard lesson list | Translate or populate from Russian content source |
| P1-26 | Content/UX | Chat | "ИИ-напарник" jargon shown to children aged 8–14 | Chat UI | Replace with "Помощник" or "Друг" |
| P1-27 | Security/COPPA | Consent | Stale consent re-prompt has no parent notification mechanism | Consent version check | Send parent email notification when consent version changes and re-prompt is triggered |
| P1-28 | Performance/DB | Cron jobs | `findMany` with no limit in cron jobs — will degrade as user table grows | Cron handlers | Add `take: 100` with cursor-based pagination to all cron `findMany` calls |
| P1-29 | UX/COPPA | Session | Consent revoked mid-lesson shows a technical error instead of a friendly redirect | Session + consent middleware | Catch consent-revoked state; show "Сессия завершена" screen and redirect to consent flow |
| P1-30 | Accessibility | Lesson | Heading hierarchy broken — h3 before h2 on lesson page | Lesson page | Fix DOM order: h1 (page title) → h2 (section) → h3 (subsection) |

---

### P2 — Polish for Premiere

| ID | Category | Screen | What's Wrong | File:Line | Fix |
|----|----------|--------|--------------|-----------|-----|
| P2-01 | Visual/Spacing | All | Non-8px-multiple spacing values throughout (gap-1.5, p-3.5, space-y-5) | App-wide | Restrict to 8px grid (gap-2/4/6/8); remove half-steps |
| P2-02 | Performance/DB | All | Missing indexes on `RewardEvent` and `AtlasLearningSession` | `prisma/schema.prisma` | Add `@@index([learnerId, createdAt])` on both models |
| P2-03 | Ops | Infra | No database health check endpoint | `src/app/api/` | Add `/api/health` returning `{ db: 'ok', ts: Date.now() }` |
| P2-04 | Security/Data | DB | Null `clerkId` shared demo row still exists in production data | DB | Delete the row; add `NOT NULL` constraint to `clerkId` column |
| P2-05 | Security/COPPA | AI | Monster `promptUsed` field stores character count of child text — still PII-adjacent metadata | `prisma/schema.prisma` | Remove character-count field; log only a boolean `promptProvided` |
| P2-06 | Security/COPPA | AI | Atlas receipt JSON content not audited for child text inclusion | Receipt storage | Add audit pass that scans receipt JSON for child text patterns before storage |
| P2-07 | UX/Audio | Session | `tick.wav`, `achievement.wav`, `level_up.wav` exist but are never played | Session + reward components | Wire to correct game events: tick on timer, achievement on XP milestone, level_up on level |
| P2-08 | UX/Animation | Session | No hover state on session input field | Session input | Add `hover:border-violet-400 focus:ring-2 focus:ring-violet-500` |
| P2-09 | UX/Animation | Gacha | GachaCalendar expand/collapse has no height animation — content jumps | GachaCalendar component | Add `transition-all duration-300` with `max-h` approach or `framer-motion` layout animation |
| P2-10 | UX/Animation | Monster | Lottie animation not tinted to monster color — all monsters look identical in mood | Monster display | Overlay monster color via CSS `mix-blend-mode` or Lottie color replacement API |
| P2-11 | Browser | TTS | Object URL memory leak in TTS — `URL.createObjectURL` blobs never revoked | TTS hook | Call `URL.revokeObjectURL(url)` in the `useEffect` cleanup |
| P2-12 | Security/Validation | Monster | Unicode control characters not stripped from pet name input | Monster creation | Add `name.replace(/[\u0000-\u001F\u007F-\u009F]/g, '')` before save |
| P2-13 | Security/Validation | Monster | No Zod schema on monster POST body | `src/app/api/monster/route.ts` | Add `z.object({ name: z.string().min(1).max(32), ... })` and validate before DB write |
| P2-14 | Content/i18n | Email | Gender-fixed "прошёл" in weekly email — wrong for girls | Email template | Use "прошёл(а)" or restructure sentence to be gender-neutral |
| P2-15 | Content/i18n | Consent | "согласен(на)" notation is awkward | Consent UI | Rewrite as "Я принимаю условия" — gender-neutral |
| P2-16 | SEO/Meta | All pages | No per-page OG meta tags | Page layouts | Add `<meta property="og:title">` and `<meta property="og:description">` to each page `metadata` export |
| P2-17 | Accessibility | Session | `focus-visible` missing on session task input | Session input | Add `focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none` |
| P2-18 | Accessibility | Session | Crystal/XP counter changes not announced to screen readers | XP counter component | Add `aria-live="polite" aria-atomic="true"` to the counter wrapper |
| P2-19 | Accessibility | Session | Task feedback not in `aria-live` region — screen readers miss right/wrong announcements | Feedback component | Wrap feedback text in `<div role="status" aria-live="assertive">` |

---

## Fix Execution Order

### Wave 1 — Security & Legal (unblock launch gate) — target: 2 days

Fix all P0 security and COPPA items before touching anything else. Priority sequence within wave:

1. Create `middleware.ts` (P1-01 — closes every open route at once)
2. Wrap consent erasure, gacha claim, reward pipeline, monster creation in `$transaction` (P0-01, P0-02, P1-03, P1-04, P1-05)
3. Add consent gate to `/api/learning/decide`, `/api/learning/outcome`, `/api/gacha/claim` (P0-04, P0-05)
4. Fix `learnerId` spoofing (P0-07)
5. Fix simulated chat moderation bypass (P0-06)
6. Add COPPA consent text: retention period, right-to-refuse, TTS disclosure (P0-08)
7. Run `prisma migrate dev --name init` (P0-03)
8. Add COPPA deletion audit log (P1-06)
9. Fix activation token enumeration (P1-07)
10. Extend `minimizeChildText` PII patterns (P1-08)

### Wave 2 — Design Token System (unblock visual QA) — target: 1 day

Do this as one atomic commit — touching tokens in isolation causes visual regressions across files.

1. Create `src/styles/tokens.css` (or `tailwind.config.ts` extension) with: 1 bg-base color, 3 opacity levels, 4 radius tokens, 3 shadow tokens, 8px spacing grid
2. Find-replace all 4 "black" hex values → `bg-base` token
3. Find-replace 14 opacity variants → 3 token classes
4. Fix all sub-12px text to 14px minimum
5. Fix WCAG contrast failures on primary button and send button (P0-09, P0-10)
6. Fix non-8px spacing, non-standard radii, card padding chaos, touch targets

### Wave 3 — Content & i18n (unblock copy review) — target: 1 day

1. Create `src/lib/errors.ts` with Russian error strings; replace all 44 English API errors
2. Fix Azerbaijani greeting in weekly email
3. Fix "Crystals" → "Кристаллы", English demo lesson titles, "ИИ-напарник" → "Помощник"
4. Fix onboarding copy / routing contradiction
5. Fix gender-fixed strings in email and consent
6. Fix child-facing network error message

### Wave 4 — UX Polish & Accessibility — target: 2 days

1. Add `middleware.ts` skip-to-content link, fix heading hierarchy, add `aria-live` regions
2. Add haptic feedback, `active:` pressed states, fail.wav on wrong answer
3. Fix z-index stack (lesson splash over reward modal)
4. Add page transitions, session skeleton loader
5. Fix Lottie static loading → dynamic import by mood
6. Fix audio cleanup on navigation; add mute button with localStorage persist
7. Fix iOS Safari zoom (input font-size ≥ 16px)
8. Add `motion-reduce:animate-none` to all spinners
9. Fix reward modal focus trap
10. Wire remaining sound assets (tick, achievement, level_up)
11. Fix TTS Object URL memory leak
12. Add Zod validation and Unicode stripping on monster name

---

*Report generated from 6 auditor inputs. Each defect ID maps 1:1 to an auditor finding for traceability. Fix waves are ordered for maximum parallelism — Wave 2 (tokens) and Wave 3 (i18n) can run concurrently after Wave 1 ships.*
