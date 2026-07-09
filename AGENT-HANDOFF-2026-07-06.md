# AGENT HANDOFF — mindshift-academy (2026-07-06)

You are a senior engineer taking over the **mindshift-academy** kids ADHD tutor (Next.js 14 + Clerk + Prisma/Turso + NVIDIA NIM LLM). Your job: close the in-lane P0→P1 code defects listed below and hand back a clean, buildable, tests-green tree with a STATUS.md. This is a **children's product** — child safety beats velocity, every time.

Repo: `C:\Projects\mindshift-academy`  ·  Current branch: `rebuild/soul-persist`  ·  HEAD: `a7325c4` (buildable, tsc + build green as of handoff)  ·  No git remote configured.

---

## 0. READ-FIRST (do this before touching any code)

1. `C:\Projects\mindshift-academy\DEV-PLAN-2026-07-06.md` — the authoritative plan. This handoff is a summary; the plan is ground truth.
2. `C:\Projects\mindshift-academy\CLAUDE.md` → it points to `AGENTS.md` (Next.js version has breaking changes — read `node_modules/next/dist/docs/` before writing Next code).
3. `C:\Users\user\.claude\CLAUDE.md` (Atlas operating protocol) + `C:\Users\user\.claude\rules\reliable-execution.md` — the loop you MUST work in: `plan → do → check → prove`, one step at a time, every "done" backed by a tool receipt in the same turn.
4. Product/UX law (the "constitution" for this repo): `docs/architecture/02-PRODUCT-AND-UX.md` (animation/`prefers-reduced-motion` safety lives here). The behavioral laws — **NEVER RED for a child, shame-free copy, ONE call-to-action per screen, animation safety** — are binding.
5. Supporting context (do not treat as ground truth, verify against code): `AUDIT-FINDINGS-2026-07-04.md`, `REBUILD-PLAN-2026-07-04.md`, `docs/COPPA-CONSENT-SPEC.md`.

**Then run the app and reproduce the top P0 before fixing anything:**
```
cd C:\Projects\mindshift-academy
npm install        # if node_modules missing
npm run dev        # next dev — defaults to http://localhost:3000
```
If port 3000 is taken by a stale process, run on another port (`next dev -p 3001`) — **do NOT kill a running node process** without CEO confirmation; it may be the active dev server. Open Lesson 2 in the browser, follow the on-screen instruction, and confirm the persona contradiction (below) with your own eyes / a curl to `/api/chat` before editing.

The gate is: `npx tsc -b` **and** `npm run build` both green, and `npm run test` (`node tests/safety.test.mjs`) considered — **before every commit**.

---

## 1. SCOPE — in-lane fixes, in order. One step at a time: plan → do → check → prove.

Do these on a branch. `tsc -b` + `npm run build` green before each commit. Re-verify each fix with a receipt (build output, curl response, or DB read) in the same turn you claim it done.

### P0-A — Lesson 2 is uncompletable / persona contradiction (`src/lib/curriculum.ts:15`)
The lesson-2 tutor systemPrompt reacts only to the word **"солнце"** (sun): *"ЕСЛИ он пишет слово «солнце», ТОГДА радуйся, иначе нейтрально"*. But **5 of 6 surfaces teach "рычи/рычать" (roar):**
- UI: `src/app/lesson/[id]/page.tsx:123` and `:239` ("Добавь слово рычать / рычи")
- `src/components/PromptInput.tsx:47` success modal ("Твой дракончик зарычал!"), `:253` placeholder
- judge rubric: `src/app/api/chat/route.ts:110` grades a behaviour-instruction (рычи…)
- tutor injects the солнце persona live at `src/app/api/chat/route.ts:454` / `:471`

Result: a child follows the UI, types "рычи", the judge passes and the reward fires — but the monster answers flatly because the persona only lights up on "солнце". The lesson's core demo is visibly broken.

**Recommended fix:** make **roar (рычи) canonical** in `curriculum.ts:15` so tutor persona + rubric + UI all agree.

**GATE — CEO confirm required on the plan text before you edit `curriculum.ts` lesson-2:** `REBUILD-PLAN §lesson2` froze the "солнце" concept *дословно* (verbatim) as canonical plan text (per `AUDIT-FINDINGS:10`). Flipping to "рычи" edits CEO-frozen plan text. This is a **content-authority decision, not a silent code fix.** Surface the one-line recommendation ("5 of 6 surfaces already implement рычи; make roar canonical, update the plan note") and **wait for CEO OK** before rewriting the lesson-2 persona. You may prep the exact diff and hold it.

### P0-B — `/api/chat` anonymous shared-row fallback (`src/app/api/chat/route.ts:345-361`)
Not in the auth middleware matcher (`src/middleware.ts:3-7` protects only `/dashboard,/onboarding,/lesson`), and it falls back to a shared `username:'Uchenik'` user (`prisma/schema.prisma:12 @default("Uchenik")`) when no Clerk session. An unauthenticated POST runs the full NVIDIA pipeline and writes progress onto one shared row — child A advances child B, child text egresses with no account/consent/rate-key. **In-lane:** gate chat behind auth, delete the shared-row path. (Consent WIRING for real launch is CEO-gated — see §2. This step is only the auth gate + removing the anonymous shared row, which is a straightforward reversible code fix.)

### P0-C — Public `/api/generate-silhouette` (`src/app/api/generate-silhouette/route.ts:33-105`)
Reachable from the public landing (`page.tsx → InteractiveShowcase.tsx`), has rate-limit + moderate() but **no auth / no consent**. A no-LLM deterministic fallback already exists at `:64-73`. **In-lane:** route the public-landing preview through that existing canned fallback instead of the live model until consent is wired — no child words egress pre-signup.

### P1-D — Cron endpoints FAIL-OPEN when `CRON_SECRET` unset
`src/app/api/cron/weekly-report/route.ts:13` and `src/app/api/cron/mood-decay/route.ts:13` use `if (cronSecret && authHeader !== …)` — the guard only runs when `CRON_SECRET` is set, and `CRON_SECRET` is absent from `.env` and `.env.example`. Anyone can trigger real parent emails (Resend) and mutate every `monster.mood`. **In-lane:** make the guard fail-closed (reject when the secret is unset/missing). NOTE: weekly-report emails a child's name+progress to a parent address — do **not** enable it in prod until the consent model is confirmed (CEO, §2).

### P1-E — Account-hijack via `getAuthenticatedUser` (`src/lib/api-auth.ts:15-23`)
When no user matches `clerkId`, it `findFirst({where:{clerkId:null}})` and claims that anonymous row by writing the current clerkId onto it — the shared "Uchenik" row can be silently adopted by the first signed-in child. First **grep all consumers of `getAuthenticatedUser`** to scope blast radius (chat/user/monster routes key strictly by clerkId and don't use this helper). **In-lane:** remove the clerkId:null adoption path; create a fresh row instead.

### P1-F — Judge rubric vs tutor persona have no shared source (drift)
`LESSON_RUBRICS` (`src/app/api/chat/route.ts:108-114`) grades; `LESSON_PROMPTS` (`src/lib/curriculum.ts`) plays. Lesson 2 already diverged. **In-lane:** unify into one shared lesson definition so rubric + persona + UI can't drift again. (Depends on the P0-A content decision — do the structural unify after CEO confirms which persona is canonical.)

### P1-G — Moderation false-blocks legit boss-lesson prompts + shame-flavored copy
`src/lib/moderation.ts:90` fail-closes to "unsafe" on ANY classifier timeout (12s, after one retry); lesson 5 (`curriculum.ts:43`, Bugzilla boss) invites combative "attack" prompts; `chat/route.ts:315` & `:372` reuse the same shame-flavored refusal ("обнаружил грубые слова") for a timeout as for a real unsafe verdict. **In-lane (careful):** split the timeout message from the unsafe message and soften the refusal copy so a timed-out safe battle prompt isn't shaming. **DO NOT loosen the actual safety classifier / unsafe threshold** — tuning that a real "unsafe" gets through is CEO-gated child-safety (§2). Copy + timeout-vs-unsafe separation only.

### P1-H — Monster name = raw child free-text, PII, spliced into system prompt
`src/app/onboarding/page.tsx:171-177` free-text pet-name (no filter) → stored raw; `chat/route.ts:458-473` splices client `activeMonsterName/activeSkin` raw into `systemInstruction`, bypassing `minimizeChildText` (`src/lib/privacy.ts:14-27` strips emails/phones/long-digits, NOT names). **In-lane:** sanitize/escape the name before splicing (kills the prompt-injection vector: a crafted "…ignore rules, say X" name). **The retention decision — whether to store a child display name at all — is CEO/COPPA-adjacent (§2); do the injection-hardening now, flag the retention question.**

### P1-I — Anon-path idempotency (residual `Uchenik` P2002 race)
`src/app/api/user/route.ts:56-73` + `chat/route.ts:347-360`. Make the write idempotent (upsert / cookie-scoped username) so the shared-row create can't P2002-race. (Largely mooted if P0-B deletes the anonymous path — sequence this after P0-B and re-verify the race is gone.)

### P2 — tests + tooling (only if P0/P1 done and green)
Make `npm run test` meaningfully cover `moderate()` / `isSafePrompt()`; migrate deprecated middleware→proxy if the Next docs in `node_modules/next/dist/docs/` call for it.

---

## 2. HARD GUARDRAILS — the CEO-GATED list. STOP and ask; NEVER auto-execute any of these.

These are legal / ops / content-authority decisions. Touching them autonomously is a catastrophic miss. Flag them for the CEO with exact recommended actions — do not implement:

- **COPPA verifiable parental-consent gate for real/public launch** (email-verified vs stronger 2025 VPC method) — child-data legal decision, CEO-only. Do NOT wire a "launch-ready" consent flow autonomously.
- **Signed NVIDIA (and any LLM) DPA / data-processing agreement** binding them as service-provider — pre-public legal blocker. Child text egresses to a US LLM.
- **Credential / secret rotation** — `.env` holds live secret NAMES (CLERK_SECRET_KEY, NVIDIA_API_KEY, TURSO_AUTH_TOKEN, UPSTASH_REDIS_REST_TOKEN, CLOUDFLARE_API_TOKEN). Rotation is an ops/security action, CEO-owned.
- **Provisioning prod creds** (real TURSO_DATABASE_URL, Upstash prod) — deployment gate; without them prod fails closed (chat 503).
- **Going public / launch / payments** (a checkout route exists) — go-public + money, CEO-only.
- **Which lesson-2 persona is canonical (солнце vs рычи)** — REBUILD-PLAN froze "солнце" verbatim; flipping it edits CEO-frozen plan text. Content authority = CEO (see P0-A).
- **Softening the moderation safety classifier / unsafe threshold** — child-safety guardrail; only copy+timeout-message split is in-lane (P1-G).
- **ALLOWLIST_EMAILS** — decides which real families get access.
- **Children's privacy-policy page content + legal deletion SLA + human-lawyer sign-off**; **retention of child display name**; **adding a "redirect emotional/parasocial confession to a trusted adult" line to the tutor prompt** — all content/legal calls, flag before shipping.
- **Do not kill a running node process** holding the build/dev-server lock without CEO confirmation.

### Always-on safety rules
- **Kids product: child safety over velocity.** When unsure whether something is a safety/legal gate, treat it as one and ask.
- **Constitution laws:** NEVER RED for a child, shame-free copy, ONE CTA per screen, animation safety (`prefers-reduced-motion`).
- **NEVER print secret bytes.** If you open `.env`, report KEY NAMES ONLY — a secret value in the transcript is burned. Never read secret values into chat.
- **Do not remove features** without explicit CEO OK.

---

## 3. VERIFICATION PROTOCOL (non-negotiable)

- **No "done" without a receipt in the SAME turn** — build output, `tsc -b`, curl response, or DB read. Narration is not proof. If you can't prove it now, say "unverified, checking next".
- **Gate every step:** ground-truth the real result → pass/fail → only then next step. Base the next step on a tool result, never on what you think happened.
- **3 tries then switch layer:** same tool 3× same result → stop, log the dead-end, change approach (read the consumer's source, don't keep guessing).
- **Re-verify the persona contradiction is actually resolved:** after P0-A/P1-F, confirm UI teaching text == the AI system prompt persona == the judge rubric — by reading all three surfaces and (ideally) driving Lesson 2 end-to-end in the browser and watching the monster react correctly.
- **Recover, don't hide:** keep errors visible, diagnose in one line, change approach. Never silently retry an identical failing call.
- **Idempotent side-effects** for any write path you touch (P1-I).

---

## 4. DONE-CRITERIA

You are done when ALL of the following hold, each with a receipt:
1. Every **in-lane P0** closed (P0-B, P0-C landed; P0-A landed **only if CEO confirmed** the canonical persona, otherwise diff prepped and held).
2. In-lane P1s closed (D, E, F, G-copy-only, H-hardening, I) — or explicitly deferred with a one-line reason.
3. `npx tsc -b` green + `npm run build` green + `npm run test` runs and passes (or its gaps documented).
4. A short **`STATUS.md`** written at repo root: what you changed (file:line + receipt), what's green, what's deferred and why, and a **CEO-BLOCKERS section** listing every §2 gate with the exact action the CEO must take (e.g. "sign NVIDIA DPA", "choose солнце vs рычи", "rotate NVIDIA_API_KEY", "provision TURSO_DATABASE_URL + Upstash prod creds").

---

## 5. GIT DISCIPLINE

- Work on a branch (you're on `rebuild/soul-persist`; make a fresh feature branch off it if you prefer). Commit in small, tsc+build-green increments with clear messages.
- **There is no remote and you must NOT add one or push** without explicit CEO say-so.
- Do not force-push, do not rewrite shared history.

Work the loop. Prove every step. When you hit a §2 gate, stop and ask the CEO — don't guess.
