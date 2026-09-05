# Sprint 3 master prompt — MindShift Academy (owner seat: Atlas / Claude Fable 5.1)

Mandate: CEO Yusif Ganbarov, 2026-08-30 «владей», 2026-09-05 «полный карт-бланш, plan → do → check → act». CEO keeps: money, marketing/positioning copy, key/code rotation (26 family codes STILL pending rotation), legal. Everything else: act, verify, report as a story. Never involve the CEO in execution; raise critical points unprompted; propose what he missed.

## 0. Read first (in this order)
1. docs/audit/OWNER-PLAN-2026-08-30.md — mandate + 4-sprint plan (S1, S2 shipped to production 2026-09-05 as e4fde8c).
2. This file.
3. docs/research/2026-09-05/DESIGN-BRIEF.md and CURRICULUM-VERDICT.md — Opus syntheses of 11 Sonnet research reports in the same directory (design-*.md, evidence-kids-ux.md, live-tokens.md, curriculum-*.md, readability-ru.json).
4. docs/audit/AUDIT-MCKINSEY-2026-08-29.md, WALKTHROUGH-UX-2026-08-29.md — the original findings.
Work on branch owner/sprint-3 (from main e4fde8c). Screenshot harness: `npx tsx scripts/e2e/walkthrough-audit.mjs` (set OUT_DIR per run). Readability: `node scripts/analysis/readability-ru.mjs`.

## 1. Crew protocol (60 Sonnet / 30 Opus / 10 Fable) — see also ~/.claude/skills/fable-crew
- Fable (main loop, planner-only seat): writes the plan, dispatches, critiques every deliverable, integrates, decides. Hooks block Fable's Bash/Edit/Write — delegate; Read/Grep/Glob usually allowed (~10 per turn).
- Opus (subagent `general-purpose`, model opus, read-only): adversarial review of Sonnet output — spot-check ≥2 URLs (WebFetch) and ≥2 repo claims (Grep/Read), judge concreteness and 8-11 fit, return accepted/score/must_fix; consolidates for Fable.
- Sonnet (subagent `claude`/`scout`, model sonnet): all hands-work — research, code, tests, writes, commits, pushes to feature branches.
- Rejection loop: Sonnet → Opus review → if rejected, FRESH Sonnet with must_fix → Opus re-review (max 2 rounds) → Fable.
- Escalation: if Fable is not confident after Opus synthesis, write docs/audit/ASTRA-PROMPT-<date>.md (full context + precise questions) and ask the CEO to paste it to GPT-6 ASTRA. Do not escalate by default.

## 2. Harness facts (proven 2026-08-29 … 2026-09-05)
- ONE worker at a time. Parallel Agent spawns and ALL Workflow-tool agents are denied («Only one Fable worker may be active. Nested or concurrent worker identity was denied»). Resuming a killed worker (SendMessage) inherits the dead seat. Use the Agent tool, fresh agent per task, run_in_background:false.
- Executor envelope: 25 tool calls / 20 min, and every tool call pays ~6 s hook latency (all hooks time out). Scope each task to ≤20 calls, pass known facts forward, say «no word-count trimming, write once», say «if budget runs low, output what you have and STOP without committing half-work».
- Secret-stream-guard: only single-statement safe-grammar commands may touch settings.json/.env; jq is NOT installed (use node -e); workers must never invoke the `claude` CLI (denied). prior-art-gate blocks Write of the first file into a brand-new directory → `mkdir -p` via Bash first.
- Reporting contract: chat = Russian storytelling (caveman, ≤~150 words, no audit sections, no tables); the audit (every claim + receipt, English) goes to C:/Projects/VOLAURA/memory/atlas/codex-loop.md BEFORE answering; breadcrumb line to C:/Projects/VOLAURA/.claude/breadcrumb.md; last line of chat in CAPS = what the CEO must do (max 2) or «ОТ ТЕБЯ НИЧЕГО НЕ НУЖНО».

## 3. Verification protocol before anything irreversible (merge / deploy / rotate)
1. Secrets in diff: `git diff --name-only origin/main...HEAD` (no dotenv/family-codes/*.db/images/backups) + pattern grep (sk-, AKIA, PRIVATE KEY, Bearer, PEPPER=, SECRET=) → 0 hits.
2. Prod compatibility: no prisma/ changes unless migrated; no new process.env names; proxy/api/config diffs reviewed.
3. CI green: `gh pr view N --json mergeStateStatus,statusCheckRollup` (unit, build, current-session-ui, atlas-learning-e2e).
4. Local gates: `npm test` (135/135 baseline), `node tests/w4-a11y-appendix.test.mjs` (18/18), `npm run lint` (0 errors), `npx tsc --noEmit`, `npx tsx scripts/e2e/current-session-flow.mjs --cross-browser`, `npm run build`, `npm audit --omit=dev --audit-level=high` exit 0. `verify:release` locally stops at check:prod-env (needs prod env) — run the rest individually.
5. docs/DEPLOY-CHECKLIST.md: `npm run db:schema` (parity) + `npm run db:backup` (restore-verified).
6. Squash-merge with a `(#N)` title (repo convention). Never push main directly.
7. Post-merge: `curl https://academy.volaura.app/api/version` shows the new sha; smoke `/`, `/api/health`, `/enter-code` = 200.

## 4. Decisions taken by Fable on 2026-09-05 (do not re-litigate without new evidence)
- Positioning stays «instruction design / prompting readiness» (CEO owns marketing claims). Ship two outcomes inside existing weeks now: (a) week 1 — the monster/AI is not alive and has no feelings; (b) week 1 session 3 — never tell an AI your name, address, school. Defer bias / «AI learns from data» / societal impact to V2 once telemetry exists.
- Companion stays CSS/SVG (no Rive/Lottie). No task voice-over yet (hint TTS stays). Buttons 48 px min-height unconditional, radius 16 px; cards radius 20 px; new type scale h1 40/30 px, h2 28/22 px (desktop/mobile), body 16 px / 1.5; `--duration-standard: 300ms`; keep existing easings; idle loops settle after ≤3 cycles regardless of prefers-reduced-motion; recompute `--text-muted` contrast per world theme (≥4.6:1).
- Mechanic interleaving lands BEFORE further visual polish. Readability rewrites ship now (10 drafted in curriculum-readability.md, 18 queued). Minimal Возврат retrieval task per week 2-5 now.
- Feedback: split a distinct «incorrect» monster state from «thinking»; failure line names WHICH part failed; retry auto-presented; praise names the action; verdict words never first; no red/alarm.

## 5. Backlog, ordered (impact/effort), with gate per item
S3-1 Copy: apply the 10 drafted rewrites; bring explanationRu/hintRu to ≤12 words/sentence (28 strings). Gate: readability script → 0 flagged in promptRu/goalRu/doneWhenRu, ≤2 in explanationRu.
S3-2 Referents: ClaimSurface renders the grid/image its claims describe; RuleSurface renders the map/cards; PatternSurface mode from task data (symbolic vs arithmetic). Gate: screenshots w5-s1, w3-s1, w4-s1.
S3-3 Tier-3 gate: author sequence-world tier-3 tasks or document dormancy in src/lib/tasks/tier-demand.ts. Gate: test.
S3-4 Worked example before the first task at concept debuts (w3-s1, w4-s1): «predict the outcome» before «author the rule». Gate: screenshots + e2e.
S3-5 Возврат: role `recall` in src/content/curriculum/types.ts + one retrieval task at session-1 of weeks 2-5 reusing the prior week's family. Gate: validateSession + e2e 15/15.
S3-6 Interleaving: each session contains ≥1 task from a different family (prior week's). Gate: script — no week uses one family for all 3 sessions; CEO's «повторение» complaint answered by screenshots of one session showing two mechanics.
S3-7 Feedback moments per §4: incorrect state, failure-part line, auto retry, action-naming praise. Gate: harness fail/pass screenshots.
S3-8 Tokens v2 in src/app/globals.css + contrast table per theme in evidence/. Gate: a11y 18/18 + computed contrast ≥4.6:1 on all 5 themes.
S3-9 Two outcomes (§4). Gate: tasks pass judge + e2e.
S3-10 «Спроси монстра» pre-threshold hint affordance via hintCostFor(), same bubble UI (no mode switch, no «are you struggling» prompt). Gate: e2e + stuck.ts tests.
S3-11 Hint ladder: one graduated partial-reveal step in src/lib/tasks/stuck.ts. Gate: unit test.
S3-12 Instrumentation: `hintUsed` on TaskAttempt, `TaskView.viewedAt` event, weekly hardest-tasks / mastery-drift / time-to-first-attempt cron reports. Gate: migration + cron dry-run.
S3-13 Map: path reveal, current-node pulse ≤3 cycles; add /map to dev demo bypass ONLY if src/proxy.ts gate is strictly development. Gate: screenshot.
S3-14 Parent dashboard: one mastery-tethered insight line («что было трудно на этой неделе»). Gate: screenshot.
Sprint gate: all of the above green + walkthrough before/after in evidence/ + PR squash-merged after §3 + prod /api/version = new sha.

## 6. Turn loop
plan (1-3 lines) → do (one worker at a time, ≤20 calls) → check (Opus review or independent Sonnet verifier, screenshots, tests) → act (commit on owner/sprint-3, push, PR) → write codex-loop.md audit + breadcrumb → Russian story → CAPS line.

## 7. What the CEO may have missed (proposed additions)
1. Pilot telemetry (S3-12) — without it every difficulty claim stays a guess.
2. One observed test session with 3 children (20 min, screen + face) — the only real proof of «удобно».
3. A Russian children's editor pass on all child copy after S3-1.
4. Sound design pass (audit found fire-and-forget TTS, no persistent mute) — schedule after S3.
5. Rotation of the 26 family codes is still open (CEO-only).
