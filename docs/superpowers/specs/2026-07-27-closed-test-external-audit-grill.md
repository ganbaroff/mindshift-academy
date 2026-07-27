# Closed-test external audit grill — MindShift Academy Thinking Curriculum

**Date:** 2026-07-27  
**Repo:** `ganbaroff/mindshift-academy` @ `main` (post #8 / #9)  
**Audience:** external auditor (product + pedagogy + engineering)  
**Purpose:** Stress-test whether the **closed test** is fully ready and thought through — not open public launch. Answers become the backlog for the next iteration.

### How to answer
For each item: **Verdict** (PASS / FAIL / CONDITIONAL) · **Evidence** (file, commit, live repro) · **Fix if FAIL** (1–3 concrete tickets) · **Confidence** (low/med/high).  
Where Atlas already has a stance, it is marked **Atlas rec:** — challenge it if wrong.

### Evidence pack (read first)
| Artifact | Path / URL |
|---|---|
| Design | `docs/superpowers/specs/2026-07-27-thinking-curriculum-design.md` |
| Defect hunt + fixes | `docs/superpowers/specs/2026-07-27-full-path-defect-report.md` |
| Product handoff | `docs/superpowers/specs/2026-07-27-opus-handoff-thinking-curriculum.md` |
| Good-child Week 1 | `docs/superpowers/specs/2026-07-27-good-child-week1-receipt.md` (63/63) |
| Engine simulation | `docs/superpowers/specs/2026-07-27-curriculum-engine-simulation-receipt.md` |
| Shipped PR | https://github.com/ganbaroff/mindshift-academy/pull/8 |
| Core code | `src/lib/tasks/*`, `src/content/curriculum/*`, `src/app/session/*`, `src/app/api/tasks/*` |

---

## A. Closed-test definition (decide before judging “ready”)

### A1. What does “closed test success” mean in one sentence?
**Atlas rec:** ≥N families complete parent→consent→w1-s1→s2→s3; each leaves a dinner-question answer; no P0 integrity incident; quit rate &lt;X% on collision task.  
**Ask:** N=?, X=?, days=?, must transfer pass be required live?

### A2. Who is in the cohort and what do they owe back?
Design says ~10 waiting users, free beta, feedback is the deliverable.  
**Ask:** Exact invite list? Written feedback protocol? In-app vs Telegram vs call?

### A3. Is Week 1 alone enough product for closed test, or must Week 2 exist?
**Atlas rec:** Week 1 alone is enough **if** entry (auth/consent/email) is rock-solid and pedagogy of precision is the only claim.  
**Ask:** Agree / disagree. If disagree, minimum Week 2 scope?

### A4. What is explicitly **out of scope** for closed test (must not be judged)?
**Atlas rec:** Weeks 2–5 content; paid checkout; gacha depth; English locale; age-declared difficulty; Azure-only interpreter proof (if Gemini path works in prod).  
**Ask:** Confirm or add.

### A5. Kill criteria — when do we stop the test and pull the product?
**Ask:** List 3 hard stops (e.g. safety false-neg on child text; consent bypass; crystal forge returns; &gt;50% cannot finish s1).

---

## B. Documentation quality (auditor reads docs cold)

### B1. Can a new engineer recreate Week 1 path from docs alone in &lt;2h?
**Ask:** Which doc is missing (runbook, env matrix, consent ops, Turso DDL, interpreter keys)?

### B2. Design doc still says “awaiting owner approval” while code shipped — is canon clear?
**Atlas rec:** Update design status to `partially shipped — Week 1` or auditors will distrust docs.  
**Ask:** Approve that status change?

### B3. Is COPPA / consent flow documented for operators (Resend domain, allowlist, code expiry)?
**Ask:** PASS/FAIL with gap list.

### B4. Are threat models for C1/C2 (client-trusted target) documented as regression tests?
**Atlas rec:** `test:attempt-trust` + CI gate — enough if named in a SECURITY or VERIFY section.  
**Ask:** Enough for closed test?

### B5. Parent-facing copy vs internal specs — do they match (landing, consent, dashboard)?
**Ask:** Spot contradictions.

### B6. What’s the single “source of truth” doc for closed-test ops?
**Ask:** Name it or declare missing.

---

## C. Code / architecture quality (kernel fitness)

### C1. Is the split correct: deterministic checker owns `pass`, LLM only interprets?
**Atlas rec:** Yes — non-negotiable. Auditor: prove no path where model free-text or client target sets `pass`.

### C2. Is `resolveCurriculumTask` the right trust boundary?
**Ask:** Any other client-supplied fields still trusted (eventId alone? concept mastery side effects?)?

### C3. Interpreter: Azure primary vs Gemini measured — is prod config honest?
**Atlas rec:** Closed test may run Gemini if prod keys match measured path; claiming “Azure primary” without receipt is a docs lie.  
**Ask:** Which provider is live in Vercel prod today? Receipt?

### C4. Privacy: are child utterances never stored in TaskAttempt / RewardEvent / logs?
**Ask:** Grep + live DB spot check. PASS/FAIL.

### C5. Rate limits + moderation on `/api/tasks/attempt` — enough for closed cohort?
**Ask:** Numbers adequate? Abuse scenario?

### C6. Crystal economy: shared `User.crystals` with gacha (H7) — acceptable for closed test?
**Atlas rec:** Accept shared; forge closed. Split only if child-test shows soft-fail conflict.  
**Ask:** Agree / force split before invite?

### C7. Session unlock server gate — can it be bypassed via direct attempt API on locked session?
**Atlas rec:** Unlock is on GET session; attempt may still accept w1-s2 taskIds without prior complete.  
**Ask:** Is that a FAIL for closed test? (If yes → gate attempt API too.)

### C8. Idempotency (`eventId`, RewardEvent) under double-submit / flaky network?
**Ask:** PASS/FAIL with scenario.

### C9. Test suite honesty: what does green CI actually prove vs false confidence?
Known: `dual-children` live half fails CI without keys; interpreter literalness may SKIP.  
**Ask:** Minimum mandatory live suites before invite?

### C10. Code readability / ownership: would you ship this kernel as-is to a second engineer?
**Ask:** Top 5 files to rewrite or leave alone.

---

## D. Pedagogy / program (is it good? interesting?)

### D1. Does Week 1 actually teach **точность**, or just grid vocabulary?
**Ask:** After s3, what belief changed? How would you measure?

### D2. Collision → explanation → practice → transfer — is the arc felt by an 8–10yo?
**Ask:** Too long? Too short? Boring after task 3?

### D3. Free `promptRu` vs paid `hintRu` — is the economy pedagogically sound or a paywall on learning?
**Atlas rec:** Scaffold behind crystals is OK if starter pack covers ≥2–3 hints and pass awards refill.  
**Ask:** Cost 5 / starter 15 / pass +3 — tune?

### D4. Visible target grid on practice (after collision) — does it invite pointing instead of speaking?
**Ask:** Keep / hide partially / require speech-first?

### D5. Dinner questions — do parents actually get them? Channel?
**Ask:** In-session only vs email vs dashboard. Closed-test must specify.

### D6. Is Russian copy age-appropriate, shame-free, funny enough?
**Ask:** Quote 3 weakest lines to rewrite.

### D7. Interest: would a child ask to come back tomorrow?
**Ask:** What moment is the “hook”? What’s missing (story, monster mood, streak)?

### D8. Design promised randomized targets; Week 1 uses fixed cells — is that a pedagogy FAIL?
**Atlas rec:** Fixed targets OK for closed test if prompts don’t dump answers; randomization is Week 2+ debt.  
**Ask:** Agree?

### D9. Only `grid-draw` in Week 1 — is one family enough to claim “thinking curriculum”?
**Ask:** Marketing claim allowed for closed test: what exact sentence?

### D10. Transfer tasks — hard enough? Too isomorphic to practice?
**Ask:** Grade each of w1-s1/s2/s3 transfer.

---

## E. Product loop / ops (closed-test reality)

### E1. Parent path: allowlist → Clerk → consent email → code → onboarding → `/session/w1-s1`
**Ask:** Live E2E on production today — PASS/FAIL with timestamp. Resend domain verified?

### E2. Google OAuth / magic link — required or email-only for closed test?
**Ask:** Pick one supported path; disable the rest in UI copy.

### E3. Child code entry (`/enter-code`) — still in path? Conflicts with parent-on-device session?
**Ask:** Clarify device model for closed test (one phone / two devices).

### E4. Support when stuck: who answers Telegram in &lt;1h during test window?
**Ask:** Name / hours.

### E5. Data deletion / revoke consent — parent can do it without operator?
**Ask:** Live click-path receipt.

### E6. Observability: how do we know a child is stuck on collision without reading utterances?
**Ask:** Metrics/events needed before invite.

### E7. Rollback plan if interpreter burns money or loops 503?
**Ask:** Kill switch / budget / degrade mode documented?

### E8. Vercel prod env parity with what CI tested?
**Ask:** Checklist signed.

---

## F. Integrity / adversarial (re-probe after #8)

### F1. Re-run forge: client `target` ≠ catalog → must not pass.
### F2. Fake `taskId` → 404, no crystals, not in `passedTaskIds`.
### F3. Collision: target not visible before first attempt; feedback must not ASCII-dump goal.
### F4. Locked session GET → 403 SESSION_LOCKED; (see C7 for attempt).
### F5. Hint reveal: no `hintRu` in public session; spend idempotent.
### F6. Whitespace / empty utterance rejected without LLM call.
**Ask:** Live receipts for F1–F6 on preview or prod with `x-test-bypass` only in non-prod.

---

## G. Claim honesty (what we may tell families)

### G1. Approved closed-test claim (one paragraph) — auditor rewrite or approve.
**Atlas draft:**  
«Закрытый тест: ребёнок учит монстра точным командам на клетчатом поле. ИИ делает ровно то, что сказано. Три короткие сессии недели 1. Нужно согласие родителя. Это не полный курс и не оценка ребёнка.»

### G2. Forbidden claims for this cohort?
**Atlas rec:** “полный курс мышления”, “5 недель”, “научим промпт-инжинирингу”, “безопасно для любого возраста без родителя”, “Azure гарантирует…”.

---

## H. Auditor deliverables (required output)

1. **Executive verdict:** CLOSED-TEST GO / NO-GO / GO-WITH-GATES (list gates).  
2. **Ranked fix list** (P0/P1/P2) with file hints — max 15 tickets.  
3. **What NOT to build** before invites.  
4. **Child-test protocol** (3 families, what to observe per session).  
5. **Doc patch list** (which markdown to rewrite).  
6. **One paragraph** on whether the **kernel** (literal monster + deterministic pass) is the right product bet.

---

## Appendix — Known Atlas decisions already taken (challenge only with evidence)

| Topic | Decision |
|---|---|
| Subject | Thinking; AI as instrument |
| Language | RU only |
| Payment | Deferred |
| Legacy Module 1 | Redirect to `/session/w1-s1` unless flag |
| Pass ownership | Checker only |
| Crystals | Shared pool for closed test |
| Collision target | Hidden until first attempt |
| Atlas `/v1/learning/decide` | Not for curriculum advice |

---

*End of grill. Fill verdicts; return as markdown reply or PR comment. Do not soft-pass integrity items.*
