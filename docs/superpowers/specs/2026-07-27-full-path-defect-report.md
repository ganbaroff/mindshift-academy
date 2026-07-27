# Defect report — full path hunt (2026-07-27)

**Scope:** Week 1 sessions + parent entry + crystals + legacy redirect  
**Agents:** [Good-child Week1](f389fc02-98e5-4c5d-8ffd-3b9aefc27a38) · [Adversarial QA](8a580588-061d-476b-b781-398368d17d85)  
**Verdict (hunt):** Engine literalness OK (Week 1 **63/63** good-child). Integrity holes live-confirmed.  
**Verdict (fix pass 2026-07-27):** Critical + High (except H7 crystal pool share) + most Medium closed on `feat/phase4-turso-session-ui`.

### Evidence merged
- Good-child: `2026-07-27-good-child-week1-receipt.md` — 21/21 × 3 = 63/63, contracts 30/30
- Adversarial: live forge was confirmed **before** fix; server now resolves catalog task (`resolveCurriculumTask`); `test:attempt-trust` covers fake id → null

---

## Critical (live-confirmed) — FIXED

### C1 — Client-trusted `target` = free pass + crystals → **FIXED**
- Server loads curriculum; client `target`/`family`/`tier` ignored

### C2 — Crystal award ignores curriculum task identity → **FIXED**
- Unknown `taskId` → 404 before award

### C3 — Collision goal grid shown before any attempt → **FIXED**
- UI hides target until first attempt; collision feedback omits target ASCII / missing cells (M6)

---

## High

### H1 — Paid hints near-answers → **SOFTENED** (scaffold language, no cell dump)
### H2 — Landing Module 1 copy → **FIXED** (Week 1 thinking)
### H3 — Skip past last task blank UI → **FIXED**
### H4 — Consent 403 English / unmapped → **FIXED** (RU + `/consent` redirect)
### H5 — Whitespace utterance → **FIXED** (schema `.trim()`)
### H6 — English API errors on child path → **FIXED** (RU)
### H7 — Shared `User.crystals` gacha + thinking → **OPEN** (product decision; not split this pass)

---

## Medium

### M1 — Session unlock w1-s1→s2→s3 → **FIXED** (server `SESSION_LOCKED`)
### M2 — Crystal writes not transactional → **FIXED** (starter + pass + spend in `$transaction`)
### M3 — Wrong client `family` mastery → **FIXED** by C1 (server family)
### M4 — Consent Module-1 chat frame → **SOFTENED**
### M5 — Dashboard empty Module-1 report → **FIXED** (empty state + copy)
### M6 — Fail feedback target ASCII on collision → **FIXED** (`hideTargetPanel`)
### M7 — No next-session CTA → **FIXED**
### M8 — dual-children skip in CI → **FIXED** (CI exit 1 if no keys)

---

## Low / UX

### L1 — Progress dots expose task ids → **FIXED**
### L2 — Noisy prisma UNIQUE on starter replay → **IMPROVED** (find-then-create in txn)
### L3 — «скажи, не нажимай» → **FIXED**
### L4–L6 — deferred / speculative

---

## What works

Auth `/session` → sign-in · `/lesson` → `/session/w1-s1` · `hintRu` stripped · hint replay free · pass award idempotent · `sessionComplete` blocks practice-only · utterances not stored · unit suites green · good-child 63/63 · forge unit trust suite

---

## Remaining

1. **H7** — separate crystal balance or soft-cap farm (needs product call)
2. Live re-probe forge against running server (regression)
3. Commit/PR `feat/phase4-turso-session-ui` when CEO asks
