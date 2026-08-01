# W0 Production-vs-Local Parity Report — 2026-07-31

**Wave:** W0 (no deploy).  
**Local HEAD (at report time):** see commit after W0 lands (pre-commit tip was `327ef5c`).  
**origin/main tip:** `7aaeffb` (chore: Clear good-child lint noise…).  
**Branch:** `docs/closed-test-audit-grill` — ahead of `origin/main` by security + canon docs commits (LOCAL ONLY for `2a54913` + `d14ed08` and subsequent docs).

## Prod hosts (behavioral surface)

| Host | Status | HTML SHA-256 | Notes |
|---|---|---|---|
| `https://academy.volaura.app` | 200 | `504EEDB77205D1F7D998845AD1D203DD2FDC1B75C9414B080F691721C2828FF9` | Title: MindShift Academy (RU) |
| `https://mindshift-academy-three.vercel.app` | 200 | **identical** | Same deployment bytes as academy host |
| `/session/w1-s1` (anonymous) | **307** | — | Auth gate live on prod |

Conclusion: both public hosts serve the **same 24.07-era deployment**. They do **not** contain local HEAD security fixes (`2a54913`, `d14ed08`).

## Code deltas on local HEAD not on prod (from `2a54913` + `d14ed08`)

### From `2a54913` (security wave 1)

| Area | Prod (24.07 / origin/main) | Local HEAD |
|---|---|---|
| `learning/decide` + `learning/outcome` | Auth only; client `learnerId` trusted | Rate-limit + parental-consent gate; reject client learnerId ≠ server-derived user (IDOR closed) |
| `gacha/claim` | Auth only | + parental-consent gate |
| `child-data.deleteChildData` | Deletes consent/verification/user graph | Also cascade-deletes `AccessCode` by clerkId **or** parent email (erasure PII gap closed) |
| `access-code/activate` GET | Public status check unbounded | Rate-limited |
| `chat` without provider in prod | Could fall through to Simulated Mode | **Fail-closed 503** in prod when no chat client |

### From `d14ed08` (premiere wave 1b)

| Area | Prod | Local HEAD |
|---|---|---|
| Consent verification consume | Plain `update` (double-redeem race) | Atomic `updateMany` where `consumedAt: null` (P0-02 closed) |
| Access-code child re-entry | Redeemed code locks out returning child | Redeemed code may re-enter **same** clerkId until expiry |
| Consent page disclosures | Vendor text present on main lineage | Additional disclosure/copy hardening on consent UI |
| Mood / i18n / contrast / session crumbs | Pre-fix | Mood floor, RU copy/audio/contrast tweaks, session page notes |

## Canon / content gaps (local docs vs running prod)

Documented in canon package (commits after `8dcb298` lineage) — **not implemented in prod code**:

| Gap | Evidence |
|---|---|
| Weeks 2–5 curriculum absent | `src/content/curriculum/` has only `week-1/` (3 sessions) |
| Executor families beyond grid-draw | Spec requires sequence-world, rule-runner, pattern-expand, claim-check — not present as families yet |
| Gacha randomness still in product surface | `src/app/api/gacha/claim/route.ts` still exists (consent-gated locally; still random-capable product) |
| No `/certificate` route | `src/app/certificate` missing |
| Landing `/` and `/enter-code` lack signed-in continue path | Confirmed gap in handoff §3 — returning-child friction |
| Session UI true e2e | `parent-journey` status-checks session **API** only; does not drive `/session/[id]` UI |
| Streak fields | In schema; not child-facing (frozen per canon) — OK |
| Prod Turso session-table presence | **UNKNOWN** (not queryable read-only this wave) — deploy blocker |

## Consent vendor-disclosure check (prepare)

Local `src/app/consent/page.tsx` names: **NVIDIA** (safety), **Google Gemini**, **Microsoft Azure OpenAI**, **OpenAI** (pet image).  
Literal string **“Llama Guard”** is **not** present (NVIDIA is described functionally as primary safety check).  

Before any pilot deploy: counsel/CEO confirm whether brand name “NVIDIA Llama Guard” must appear verbatim vs current functional wording. Live prod copy version tagged 2026-07-24 — re-verify on live HTML at deploy time (checklist).

## Summary

Prod ≠ local HEAD. Deploying without CEO approval would ship security + re-entry fixes but still leave Weeks 2–5 / certificate / gacha-replacement / session e2e incomplete. W0 records parity only; **no deploy**.
