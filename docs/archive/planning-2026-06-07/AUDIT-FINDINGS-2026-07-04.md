# MindShift — Audit findings + architecture verdict (2026-07-04)

> 18-agent adversarial audit (opus) on branch `rebuild/soul-persist` @ a7325c4. 19 findings, 14 critical, all verified by a second adversarial pass. Companion to `REBUILD-PLAN-2026-07-04.md`. Fable planned/verified; opus executed & verified. Full raw output: workflow wjq40xrhe.
> Severity re-graded where the verify pass refuted/narrowed a claim. Each item = file:line + recommended fix.

## 0. Regression introduced by the soul-wiring (own it)

**P0 — Lesson 2 now openly contradicts itself at runtime.** `src/lib/curriculum.ts:15` lesson2 persona is a hidden "ЕСЛИ «солнце» ТОГДА радость" rule, but every shipped surface teaches "заставь дракона РЫЧАТЬ": intro `lesson/[id]/page.tsx:123`, goal card `:240`, placeholder `PromptInput.tsx:253`, success modal `:47`, and the judge rubric `chat/route.ts:110`. The soul-wiring commit d0627d8 piped the stale `солнце` persona verbatim into the live tutor (`chat/route.ts:454,471`). Result: child follows the on-screen task ("рычи"), judge passes + reward fires + modal says "Твой дракончик зарычал!", but the injected persona tells the monster to stay neutral unless it sees "солнце" — the monster answers flatly, contradicting the reward. **The fix landed the pedagogy but exposed that the curriculum text and the UI were authored as two different games.**
Fix: rewrite `curriculum.ts` lesson2 systemPrompt to the "obey the child's persona rule (рычи/dragon)" behavior the 5 UI surfaces already teach — one file. Deeper: the judge grades `LESSON_RUBRICS` while the tutor plays `LESSON_PROMPTS` from a different file — they can drift again; long-term derive each lesson from one shared definition.
CEO note: `REBUILD-PLAN §lesson2` froze the `солнце` concept "дословно" — so fixing this edits the plan's canonical text. Recommended: make "рычи" canonical (5 surfaces already implement it) and update the plan line.

## 1. P0 — launch-blockers (all CONFIRMED)

**Consent gate absent — child reaches NVIDIA with zero parental consent.** Public landing (`page.tsx:193` → `InteractiveShowcase.tsx:85` → `api/generate-silhouette/route.ts`, no auth) AND `api/chat` (not in middleware matcher; anonymous "Uchenik" fallback `chat/route.ts:345-361`) both ship child text to a US third-party LLM before any consent. No `ParentalConsent` model exists; `docs/COPPA-CONSENT-SPEC.md` is written but unwired. Fix: implement ParentalConsent + a fail-closed `requireConsent(clerkId)` guard on chat/tts/monster/silhouette; remove the Uchenik fallback; make the public landing demo **no-LLM/canned** (the route already has a deterministic fallback at `generate-silhouette/route.ts:64-73`). Blocked on **NVIDIA DPA** (CEO/legal) for public launch.

**Reward stuck — returning child gets no reward, can't advance.** `chat/route.ts:393` gates reward on `serverStepId === activeStepId`, but the client `activeStepId` is set purely from the URL (`lesson/[id]/page.tsx:91`) and never synced to the server's `activeStep` (the `/api/user` fetch drops it, though `user/route.ts:76` returns it). A child returning on a fresh device / via onboarding's hardcoded `/lesson/1` sends step 1 while server = 3 → judged against the wrong rubric, reward silently withheld, stuck. Fix: award on `serverStepId` alone (drop the equality clause — it has zero anti-cheat value since serverStepId is already the sole authority) AND sync the store from `data.activeStep` on load / redirect to the real lesson.

**Cron fail-open — anyone can blast every parent's email.** `cron/weekly-report/route.ts:13` and `cron/mood-decay/route.ts:13`: `if (cronSecret && ...)` — when `CRON_SECRET` is unset the check short-circuits and any unauthenticated GET runs. weekly-report iterates all users and emails every parent via Resend. Fix: invert to fail-closed `if (!cronSecret || authHeader !== ...) return 401`, both files.

**Magic-moment-before-signup missing (PARTIAL — core confirmed).** `/onboarding` and `/lesson` are auth-protected (`middleware.ts:3-7`); the child hits the Clerk wall before ever taming the monster. (Verify narrowed one claim: the landing DOES have a cosmetic silhouette preview before signup — but the actual taming loop is auth-gated.) Fix: expose one anonymous first-taming step, keep its state **client-side only** (Zustand persist, already added), write to DB only after signup on "Сохрани моего монстра" — avoids the shared-row collision.

**Anonymous "Uchenik" shared row (CONFIRMED, scoped).** `chat/route.ts:345-361` + `schema.prisma:12` `@default("Uchenik")`: every session-less caller shares one DB row → one child's completion advances/awards another's progress. Reachable via direct anonymous POST to `/api/chat` (not in protected matcher) or dev `?demo=1`. Authenticated production users are unaffected. Fix: gate `/api/chat` behind auth + delete the shared row path; any public demo must be stateless (no shared DB row).

## 2. P1 — real, not launch-blocking (CONFIRMED unless noted)

- **Monster name = raw child PII to DB + NVIDIA + injection surface.** `monster/route.ts:73,81` stores raw `name` (only the image-prompt copy is sanitized); `chat/route.ts:458,462,473` splices unbounded client `activeMonsterName/activeSkin` raw into the system prompt (skips `minimizeChildText`). A child names the monster after themselves → real name in DB + egresses to NVIDIA every turn; crafted name = prompt injection. Fix: persist `safeName` (cap 40, strip newlines/quotes); in chat read persona from the server-side Monster row, not the client. (Note: `minimizeChildText` doesn't catch free-text names — storing a child display name is itself a COPPA data-model decision.)
- **TTS = unmoderated paid text proxy.** `tts/route.ts:23-34` sends arbitrary authenticated client text to paid OpenAI TTS with no `moderate()`. Fix: moderate before synth, or bind TTS to the chat route's already-moderated output via a server-issued token.
- **Simulated (no-API) mode step mismatch (dev/keyless only).** `chat/route.ts:404-434` branches reply text on client `activeStepId` while judging on `serverStepId`. Fix: branch on `serverStepId`. Only affects keyless/dev runs.
- **Hollow economy.** `retention-engine.ts:6` `STREAK_FREEZE_COST=500` has zero consumers; crystals only ever increment; `recoverMood()` unconsumed; checkout is a 410 stub; gacha hands skins out free. Fix (server-authoritative + idempotent): ship the "wake pet from спячка for 500💎" sink first (restores mood, shame-free), then a skin shop.
- **No "monster is a program / can be wrong" screen + no confession-redirect.** Plan §4.8 unmet; `onboarding/page.tsx` is hatch+name only; tutor `chat/route.ts:456-466` only redirects on *unsafe* messages (`:372`), not benign parasocial ones. Fix: first-run AI-literacy card + one tutor system-prompt line redirecting emotional confessions to a trusted adult (ship the line now, card with Phase 2).
- **Non-Socratic tutor hands the answer.** Rule 4 "не давай готовое решение *сразу*" is a loophole; personas + goal cards + placeholders spell the exact winning keyword; child copies it verbatim, passes, learns nothing. Fix: explicit anti-cheat Socratic rule (never emit a usable prompt, ask one leading question) + gate literal hints behind a "нужна подсказка?" reveal.
- **Growth-mindset copy missing; shame-blocks on boss lesson.** No strategy-praise on failure; success copy praises the child; moderation refusals are shame-flavored (`chat/route.ts:315`) and fail-closed timeouts false-block legit boss-lesson battle prompts. Fix: reword refusals non-shaming, split timeout-message from unsafe-message, add strategy-praise nudge on failed attempts.

## 3. Audit self-corrections (verify pass narrowed these — honesty)

- **eventId atomicity → downgraded P1→P2.** The atomicity gap is real (`chat/route.ts:198` commits eventId before the balance writes, non-transactional), but the "permanent loss via same-eventId retry" scenario is **refuted**: the client mints a fresh UUID per send (`PromptInput.tsx:77`), no auto-retry loop exists. Real fix still worth doing: wrap the 4 writes in `prisma.$transaction`.
- **Persisted `steps` cache → PARTIAL.** The claimed "cache overrides server progress" is **refuted** (the lesson page recomputes steps from the URL on mount, clobbering the cache). But the underlying defect is real and inverted: progress is **URL-driven, not server-driven** — a returning child on a fresh browser sees steps 2-5 locked despite server progress. Fix: rebuild the steps map from `data.activeStep` on load.

## 4. Architecture verdict — platform vs module

**What it IS today: a standalone single-product app.** No module registry, no face-picker, no role/profile router, no shared shell. `src/app/` is flat and monster-specific; `layout.tsx` hardcodes Clerk + MindShift; `schema.prisma` is single-child (`Monster @unique userId` — this IS the "second child = 500" root); `access.ts` is a flat allowlist. The verified brain (moderation, judge, privacy, ratelimit, curriculum, persistence guard) is real but wired into this one app, not packaged.

**What happens when you add module #2 today: nothing good.** No seam to plug into → you'd copy the whole app (rebuild auth, DB, shell, brain integration) or bolt a second route into one app with a data model that assumes the monster. "Add a module" = fork or surgery, not "register a module". And "parent picks for child" is unrepresentable — there's no Child/Profile entity or role on User.

**What you want = platform shell + module registry + role-based entry.** MindShift becomes module #1. Key finding: **VOLAURA already solved this** — `apps/web/src/components/navigation/bottom-tab-bar.tsx` is a typed product-switcher/registry (volaura|aura|mindshift|lifesim|brandedby|atlas, accent/icon/href/flag), `app/[locale]/(dashboard)/` is one folder per face, plus `character_events` bus, energy modes, and the ecosystem-design-gate laws.

**The one decision that's yours (blocks the migration):**
- (A) Fold MindShift into VOLAURA's existing shell. Pro: skeleton already built. Con: forces children onto VOLAURA's Supabase auth + mixes under-13 kids into a B2B recruiting product — a real COPPA/positioning hazard.
- (B) **[recommended]** New dedicated **family shell** that reuses VOLAURA's *pattern* (registry, route-group-per-module, character_events, design gate, energy modes, tab-bar as template) + the *brain*, but keeps MindShift's Clerk + parent-owns-account COPPA model. Con: re-stand-up the shell (copy proven structure, don't invent).
Recommendation: **B** — reuse the pattern and the brain, not the literal B2B tenant. Children don't belong on the recruiting surface.

**Role-based entry needs a schema change (also fixes second-child-500):** add a `Profile`/`Child` entity so `User(1)→Profile(N)`; re-key `Monster/LessonProgress/Inventory/RewardEvent` from `userId` to `profileId`. Adult-for-self = one self-profile; parent-for-child = N avatar-picked child profiles (no child login). ParentalConsent attaches per child profile.

**Migration path (extract-and-mount, never rm -rf):**
0. (done on `rebuild/soul-persist`) soul + persistence — verify on a live run first.
1. **CEO decides shell A vs B** (blocking).
2. Extract the verified brain into a self-contained module package, unchanged; re-run live moderation/judge checks to prove byte-for-byte safety preserved.
3. Add Profile/Child entity; re-key to profileId (fixes second-child-500); migrate Turso with backup guard.
4. Stand up the shell by copying VOLAURA's structure: route-group-per-module + a registry object (template = bottom-tab-bar) + post-auth profile-picker + the design-gate laws. Keep Clerk.
5. Mount MindShift as module #1 consuming the brain package + active profileId.
6. Prove the seam with a throwaway module #2 stub — DONE = adding it needed only a registry row + a folder + a flag (no auth rebuild, no schema fork).
7. Consent gate + CRON_SECRET fail-closed at the shell level so every module inherits it.

**Risks:** re-key migration is invasive on live Turso (backup first — and the repo has **no git remote**, one-disk risk); brain-extraction can silently change safety behavior (re-verify on live classifiers); premature abstraction (validate the seam with the stub before investing); two divergent "MindShift" definitions exist (VOLAURA tab calls it a "standalone Android focus app" vs the kids tutor) — reconcile positioning; NVIDIA DPA still gates public launch.
