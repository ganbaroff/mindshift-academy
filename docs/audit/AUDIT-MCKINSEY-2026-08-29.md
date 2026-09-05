# MindShift Academy — full-scope audit (McKinsey format)

> 2026-08-29, repo @ `697e723` (main, clean). Method: 4 sequential Sonnet workstreams (security / docs-vs-reality / UX-a11y-motion-sound / curriculum-pedagogy, ~25 tool calls each) + Opus orchestrator (verification + live-browser probes on academy.volaura.app) + Fable synthesis. 60/30/10 model split enforced by seat protocol. Every finding carries a receipt; unverified items are listed in §7, not mixed in.

## 1. Verdict

**Grade: C+.** Fail-closed safety stack, deterministic anti-gaming assessment, full cascade deletion and unusually rigorous reduced-motion handling are above the bar for a seed-stage pilot. But: a live moderation prompt contradicting the product's own age canon, a closure screen that always claims the certificate is ready, 26 real family codes in plaintext at repo root, and live-measured WCAG AA contrast failures mean the product is defensible only inside a small consented closed pilot — not yet publicly.

Weighted theme scores (base 1-10 by severity, ×2 child-harm/legal multiplier):

| Theme | Score | Verdict |
|---|---|---|
| D. Accessibility & sensory autonomy (WCAG 2.2 AA / ICO AADC) | 70 | Largest cluster; strong foundation undercut by concrete AA failures + 2 nudges |
| B. Child data privacy & COPPA hygiene | 64 | No single breach; retention+disclosure+deletion+plaintext-codes stack up |
| F. Docs/registry & engineering hygiene | 44 | Many items, low stakes each; readiness registry no longer trustworthy |
| A. Age-band identity crisis (8-11 vs 8-14) | 36 | One undecided question contaminating safety prompts, requirements, docs |
| C. Child-facing trust & deception | 30 | Only 2 findings, both product-lies-to-child; highest severity density |
| E. Assessment & pedagogical integrity | 30 | Design sound; enforcement covers 1 of 5 task families |

## 2. P1 findings (all personally re-verified by orchestrator or live-measured)

| ID | Finding | Receipt | Fix | Wave |
|---|---|---|---|---|
| C-3 | `certificateReady \|\| true` — closure screen always claims certificate ready regardless of real eligibility | `src/app/session/[id]/page.tsx:489` | drop `\|\| true` — **FIXED in working tree during this audit** | R1 ✅ |
| D-1 | Moderation/safety prompts hardcode «дети 8-14» vs canon 8-11 V1 | `src/lib/moderation.ts:8,107,146` | CEO decides age band, then patch prompts | R1 (CEO) |
| D-12 | 26 real pilot family codes in plaintext at repo root (gitignored but sync/agent-exposed) | `family-codes-2026-08-04b.txt` (11), `family-codes-2026-08-05.txt` (15) | move out of repo, rotate codes | R1 (CEO) |
| U-1 | Raw `err.message` (English exception text) rendered to a 9-year-old | `src/app/session/[id]/page.tsx:209`, `src/components/showcase/InteractiveShowcase.tsx:95`, `api/learning/{outcome:94,decide:109}` return `err.message` | route through `src/lib/errors.ts` fallback | R1 |
| U-2 | TTS narration is fire-and-forget — child cannot stop or replay the voice | `src/components/chat/PromptInput.tsx:180-189` | keep Audio ref, add stop/replay | R1 |
| U-3 | Mute not persisted (module var), no visible mute UI caller found | `src/lib/sound-engine.ts:3,132` | persist via existing Zustand `persist`, surface button | R1 |
| U-13 | Live-measured: secondary text `rgba(43,35,32,.52)` at 14px ≈3:1 contrast — below AA 4.5:1 on child-facing /enter-code | live computed-style probe 2026-08-29 | raise opacity/token to ≥4.5:1 | R1 |
| D-2 | Founder-requirements record self-contradicts: 8-14 (line 57) vs 8-11 (line 161) | `docs/FOUNDER-REQUIREMENTS-RECORD.md:57,161` | annotate superseded | R1 |
| D-4 | Readiness registry lists gacha "ACTIVE, needs fix" — actually retired (unconditional 410) | `docs/release/MINDSHIFT-PILOT-READINESS.md:12,87-94` vs `api/gacha/claim` | close with receipt | R2 |
| D-5 | Registry lists P0-03 "no migrations" — 4 migrations exist (`0000_baseline..0003`) | `MINDSHIFT-PILOT-READINESS.md:26` vs `prisma/migrations/` | close with receipt | R2 |
| D-6 | Touch-target defect listed open (30×45px) — live-measured today 56×56px inputs, 44-48px buttons at 375px = FIXED; W4 receipt and appendix never reconciled | `W4-RECEIPT:28` + `PILOT-READINESS:238` vs live probe | reconcile registry | R2 |
| D-10 | README omits Azure OpenAI — the actual provider seeing child text (COPPA-relevant vendor list wrong in the repo's top doc) | `README.md:19` vs `src/lib/ai-provider.ts:41-47,90-104` | rewrite AI section | R2 |
| S-1/6 | `dev.db` + `prisma/dev.db` committed in root commit `4bc78ab`, recoverable via `git show` forever; content uninspected | `git diff-tree --root 4bc78ab` | inspect offline; scrub history if real data | R1-R2 |

## 3. P2 findings

- **S-4** No retention/purge fields on `ParentalConsent`, `ConsentVerification`, `TaskAttempt`, `SessionCost` etc. — only `DegradeEvent` has `retentionUntil` (`prisma/schema.prisma:90-298`). COPPA data-minimization gap. → R2, M.
- **S-7** `restartChildData` leaves `FormulationSubmission` + `Certificate` rows (deletes 9 tables, cascade never fires because User row is updated not deleted) (`src/lib/child-data.ts:10-31`). → R2, S.
- **S-8** No CSP, no Permissions-Policy, no HSTS (`next.config.ts:9-14`, `vercel.json` has no headers key). → R2, M (tune against Clerk/Azure origins).
- **U-4** Blocking `GeneratingOverlay` lacks `role`/`aria-modal`/`aria-busy` (`src/components/modals/GeneratingOverlay.tsx:16-17`). → R2, S.
- **U-5** `MonsterCard` comment claims Tab-trap; no trap code found; no backdrop dismiss (`MonsterCard.tsx:12` vs body). → R2, S-M.
- **U-6** Dashboard streak counter «Серия дней» + pulse contradicts app's own no-streak principle (`dashboard/page.tsx:166,176` vs `src/lib/evolution.ts:1-4`, `MilestoneJourneyMap.tsx:15`). ICO AADC lens. → R2, product call.
- **C-4** Tier-3 mastery gate implemented for 1 of 5 task families; rule-runner exploit documented in the code itself (`src/lib/tasks/tier-demand.ts:12-20`). → R2, L.
- **C-5** Single-tier hint, no ladder, no skip path — frustration dead-end for 8-11 (`api/hints/reveal/route.ts:1-3,104-109`). → R2, L.
- **C-6** Session schema has no `Возврат`/`Итог` roles vs canon 6-phase arc (`src/content/curriculum/types.ts:16`). → R2, M.
- **C-2** Hallucination-correction exercise stranded in disabled legacy lesson4 (`src/lib/curriculum.ts:60-66`); verification concept IS live as week-5 (`evolution.ts:26`) — port the gem. → R2, S.
- **D-3/D-7/D-8/D-9** Doc staleness sweep: 3 docs missed age sweep; appendix wrong about e2e wiring (now in `package.json:59`) while `coach-smoke.mjs` still absent; canon §8 "weeks 2-5 unwritten" vs all 15 sessions shipped (`src/content/curriculum/index.ts:19-35`); README stack drift (Next 16.2.9 vs 16.2.12, 8 vs 18 models). → R2, S each.

## 4. P3 findings

**S-9** ~15 API routes log raw error objects vs the redacted `.name`-only pattern used elsewhere (worst: consent paths). **U-8** 3 progress bars animate `width` not `transform` (motion-reduce-guarded). **U-10** `session/[id]/page.tsx` = 1015 lines. **U-11** +50 XP for enabling voice = reward for feature acceptance (`PromptInput.tsx:253-259`). **U-12** dead `gacha.wav`. **C-7** parent-report week label = `ceil(sessions/3)` not actual week set (`api/cron/weekly-report/route.ts:73-76`). **C-8** streak widget data source unlocated. **D-11** consent SPEC doc names NVIDIA-only — live page correctly names all 4 vendors, spec is the stale side (`docs/COPPA-CONSENT-SPEC.md:105` vs `src/app/consent/page.tsx:46,56`). **D-13** README provider order.

## 5. What is genuinely strong (receipts held)

- Moderation fail-closed: any classifier error blocks the message (`src/lib/moderation.ts:184-185`).
- Rate limiting fail-closed in prod without Upstash (`src/lib/ratelimit.ts:65-67`); cron routes reject on missing/wrong `CRON_SECRET` (both routes, line 17-18).
- Consent resolver fail-closed, timing-safe compare, race-safe code redemption (`src/lib/consent.ts:29-46,174-195`).
- `deleteChildData` full cascade incl. User; schema stores no child name/age/photo/voice; raw child text structurally excluded from attempt/telemetry models.
- Anti-gaming assessment: LLM only interprets free text into a typed program; deterministic server-side resolver with server-only answer keys; client payload strips answers (`api/tasks/attempt/route.ts:345-366`, `types.ts:110-116`).
- Rewards deterministic, threshold-gated, never login/time/streak (`src/lib/evolution.ts`); certificate requires mastery + capstone artifact (`api/certificate/route.ts:61-84`).
- Reduced-motion rigor: 3 media blocks + per-site `motion-safe`/`motion-reduce` + `MotionProvider` patches framer v12 + JS `matchMedia` for canvas confetti.
- Vault↔code parity: all 5 weeks / 15 sessions / 75 task files shipped and registered.
- Live probes 2026-08-29: prod 200, zero console errors, /enter-code inputs aria-labeled 56×56px, report-problem button mounted globally.

## 6. Roadmap (fable synthesis, 60/30/10 executor split)

**R1 — before next pilot family (days):** C-3 ✅done · age decision + moderation.ts patch (CEO→sonnet) · family-codes move+rotate (CEO gate) · U-1 child-safe errors (sonnet) · S-1/6 dev.db blob inspection offline (opus) · U-13 contrast token (sonnet) · U-2/U-3 stop/replay + persistent mute (opus) · S-9 consent-path log redaction (sonnet).

**R2 — before paid/public (weeks):** S-4 retention schema (fable policy → opus) · S-7 (sonnet) · S-8 CSP/HSTS (sonnet) · registry+README reconciliation sweep D-4/5/6/7/9/11/13 (sonnet) · D-10 vendor disclosure (sonnet+fable signoff) · U-4/U-5 (opus) · U-6/U-11 nudge redesign (fable call → opus) · C-4 tier-3 gates ×4 families (opus, L) · C-5 hint ladder + skip (opus, L) · C-6 arc phases (opus) · C-2 port (sonnet) · C-7 (sonnet) · coach-smoke CI (sonnet).

**R3 — world-class (month+):** COPPA/AADC compliance program + parent data-rights dashboard · U-10 session-page decomposition · independent WCAG 2.2 AA audit with assistive-tech users · external UNESCO AI-literacy curriculum review · engagement model finalization (C-8) · third-party pentest.

**Strategic call (CEO):** pick ONE age band. Canon says 8-11; marketing says 8-14; the code is tuned for neither ("compared to world standards" is always scored against the YOUNGEST marketed age). Recommendation: commit to 8-11 everywhere in R1; treat 8-14 as a future separately-audited tier, not a label change.

## 7. Not verified this pass

`dev.db` blob content (deliberately not opened — inspect offline). PILOT-READINESS items P0-10/13/14/15/16/17/19, P1-02/03/08/29 individually. Weeks 2/3/5 session bodies (age-fit sampling generalizes from 2 files). Exact moderation-block copy tone. `npm test` / `verify:release` not run (audit was read-only). MonsterCard full body. Session-duration vs attention-span math.
