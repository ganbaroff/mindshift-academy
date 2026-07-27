# Opus handoff — Thinking curriculum product gaps (2026-07-27)

**Repo:** `mindshift-academy`  
**Audience:** Opus / senior product-engineering review  
**Evidence:** dual-children runners + crystal tests + live session UI

## What shipped (locked)

| Piece | Status |
|-------|--------|
| Deterministic engine (`grid-draw`, `sequence-world`) | live |
| Literal interpreter (Gemini measured; Azure pending) | live |
| Week 1 sessions 1–3 content | live |
| `/session/[id]` child UI | live |
| Mastery + spacing + TaskAttempt on Turso | live |
| **Scaffold hints for crystals** (not answer dump) | live |
| Onboarding → `/session/w1-s1` (not legacy `/lesson/1`) | live |
| Dual runners: good-child 7/7 pass, bad-child 7/7 fail | live |

## Crystal economy (minimal closed loop)

- Starter: **15💎** once per user (`ensureStarterCrystals`)
- Hint cost: **5💎** → returns `hintRu` scaffold only (how to speak, never cell list)
- Task pass: **+3💎** first time per `sessionId:taskId`
- Idempotent via `RewardEvent` eventIds (`hint:…`, `taskpass:…`, `crystal-starter:v1:…`)
- GET `/api/tasks/session/:id` **strips** `hintRu`; reveal only via `POST /api/hints/reveal`

## Dual-child evidence (w1-s1)

```
good-child: 7/7 precise utterances → pass
bad-child:  7/7 vague utterances → fail / unclear
contracts:  hintRu present, public payload strips hints, practice prompts do not name figure
```

Command: `npm run test:dual-children` (needs GEMINI or Azure key for live interpret half; contracts run offline).

### P0 — Two curricula in one product — DONE 2026-07-27
- `/lesson/*` redirects to `/session/w1-s1` unless `LEGACY_MODULE1_ENABLED=1` (or `E2E_LEGACY_LESSONS=1` for Chromium suite).
- Dashboard primary CTA = Week 1 sessions; Module 1 report demoted to “наследие”.
- Archive lesson UI (when enabled): ✓ Пройден badge, strike-through, replay banner (no new XP).

### P0 — Completed-state UX — DONE 2026-07-27
- Session strip shows ✓ per passed task; resume from first incomplete via `passedTaskIds`.
- Revisit banner: “уже пройдено — повтор без награды”.

## Product problems still open (prioritize)

### P1 — Hint pedagogy calibration — PARTIAL DONE
- Collision hides target until first attempt (shipped in #8).
- Remaining: cost curve (flat 5 vs rising) — defer until child-test data.

### P1 — Crystal economy depth
- Earn/spend works; insufficient → 402 RU.
- **Closed-test decision (Atlas, 2026-07-27):** keep **shared** `User.crystals` with gacha. Forge farm closed by server-trusted attempts. Split balances only if child-test shows soft-fail conflict.

### P2 — Content scale
- Plan = 5 weeks × 3 sessions. Only Week 1 authored.
- Families `rule-runner`, `pattern-expand`, `claim-check` unproven.
- Session size 7 tasks; design wanted 8–12 for 15 min — calibrate with real kids.

### P2 — Azure interpreter gate
- Locked decision: Azure primary. Local measured Gemini only.
- Still needed before prod confidence.

### P2 — Parent weekly report
- Dinner question exists in content; Resend domain historically unverified → email blocked.

## Shipped on main (#8, 2026-07-27)

Server-trusted attempts · session unlock · crystal hint economy · Week 1 s1–s3 UI · forge trust CI · Turso curriculum DDL verified live.

## Suggested Opus output format

1. **Verdict** on hint-as-scaffold (keep / tighten / change cost)
2. **Legacy Module 1** disposition (3 options + recommendation)
3. **Next 5 engineering tickets** ordered by learning risk (not vanity)
4. **What NOT to build** this sprint
5. **Child-test protocol** for 3 families (what to observe: attempts/tier, hint buy rate, quit points)

## Commands for reviewers

```bash
npm run test:session          # content + mastery
npm run test:crystals         # spend/earn idempotency
npm run test:dual-children    # good vs bad synthetic kids
npm run test:tasks            # deterministic engine
npm run test:parent-journey   # public route smoke (needs local server)
```

## Non-goals for this handoff

- Do not redesign Atlas learning NBA into curriculum decisions.
- Do not paywall Week 1.
- Do not make grid cells tappable (pedagogy: must speak).
