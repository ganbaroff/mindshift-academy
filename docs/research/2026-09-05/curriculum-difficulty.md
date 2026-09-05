# Curriculum difficulty & pacing calibration — from code, no telemetry

Generated 2026-09-05. Repo `C:\Projects\mindshift-academy`, branch `owner/experience-rebuild`.
No `TaskAttempt` rows exist yet to measure against — everything under "Pacing estimates" is a
**code-derived estimate with stated assumptions**, not a measurement. Treat as a planning prior to
replace with real data per the Instrumentation plan (§6).

## 1. Inventory table — tasks per session, per family, per tier

Confirmed by reading `src/content/curriculum/index.ts` (15 sessions registered) and grepping
`family:` / `tier:` across `src/content/curriculum/week-{1..5}/session-{1..3}.ts`. Total = 81 tasks,
matching the brief.

| Week | Session | Family | Tasks | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|---|---|---|
| 1 | s1 | grid-draw | 7 | 5 | 2 | 0 |
| 1 | s2 | grid-draw | 7 | 1 | 5 | 1 |
| 1 | s3 | grid-draw | 7 | 1 | 4 | 2 |
| 2 | s1 | sequence-world | 5 | 4 | 1 | 0 |
| 2 | s2 | sequence-world | 5 | 4 | 1 | 0 |
| 2 | s3 | sequence-world | 5 | 4 | 1 | 0 |
| 3 | s1 | rule-runner | 5 | 4 | 1 | 0 |
| 3 | s2 | rule-runner | 5 | 4 | 1 | 0 |
| 3 | s3 | rule-runner | 5 | 4 | 1 | 0 |
| 4 | s1 | pattern-expand | 5 | 4 | 1 | 0 |
| 4 | s2 | pattern-expand | 5 | 4 | 1 | 0 |
| 4 | s3 | pattern-expand | 5 | 4 | 1 | 0 |
| 5 | s1 | claim-check | 5 | 4 | 1 | 0 |
| 5 | s2 | rule-runner | 5 | 4 | 1 | 0 |
| 5 | s3 | rule-runner ×3 + claim-check ×2 | 5 | 0 | 5 | 0 |

**Family totals:** grid-draw 21, rule-runner 23, sequence-world 15, pattern-expand 15,
claim-check 7. **Tier totals:** Tier 1 = 51 (63%), Tier 2 = 27 (33%), Tier 3 = 3 (4%).

**Notable inconsistency (code, not guessed):** all 3 authored tier-3 tasks are `grid-draw`
(`week-1/session-2.ts:91`, `week-1/session-3.ts:88,102`). Zero `sequence-world` tasks are tier 3
anywhere in the shipped curriculum. But `src/lib/tasks/tier-demand.ts` — the only module that adds
an extra tier-3 demand — fires exclusively on `family === "sequence-world"` (line 75); its own
docstring (lines 12-20) explains `grid-draw` is deliberately excluded because it "already requires
an exact answer." Net effect: **`tier-demand.ts` is currently inert** — the curriculum never asks
the one family it tightens, and the family it does tighten for (grid-draw tier 3) relies solely on
the base exact-match checker with no visible extra rule told to the child. Worth a decision: either
author sequence-world tier-3 tasks, or park the module with a comment saying why it's dormant.

## 2. Escalation contract (from `src/lib/tasks/stuck.ts`, `tier-demand.ts`, `src/app/api/hints/reveal/route.ts`)

- **Trigger:** `STUCK_AFTER_FAILURES = 2` (`stuck.ts:18`). `isStuckOnTask(failedAttempts) = failedAttempts >= 2`.
- **Hint price:** `hintCostFor` returns `0` once stuck, else `normalCost` (`stuck.ts:25-27`). The
  route computes `failedAttempts` as `prisma.taskAttempt.count({ where: { userId, sessionId, taskId, pass: false } })` —
  **but only when `uxV11Enabled()` is true** (`route.ts:104-108`); if that flag is off, `failedAttempts`
  is hardcoded to `0` and the hint never goes free. I did not read `src/lib/ux-flags.ts` this pass —
  **UNVERIFIED** whether `uxV11Enabled()` defaults on in prod.
- **Copy escalates by attempt count**, not just a binary switch (`stuckNoticeRu`, lines 33-42):
  attempt 2 → "вот подсказка, бесплатно"; attempt 3 → "давай я скажу, что бы сделал сам"; attempt 4+ →
  explicit permission to disengage ("можно и вернуться сюда позже"). No modal, no mode switch — same
  message shape as normal feedback, per the module's own contract comment (lines 1-14, citing
  `docs/architecture/08-UX-MONSTER-JOURNEY.md` §10.1).
- **No attempt cap, no skip mechanism found** in the three files read. I grepped only these three
  files for this pass, not the whole repo for "skip" — **UNVERIFIED** whether a skip-task escape
  hatch exists elsewhere.
- **Idempotent unlock:** hint reveal goes through `spendCrystalsForHint`'s ledger regardless of
  price (0 or normal), so a replayed request doesn't double-charge (`route.ts:111-116`).
- **Gates ahead of the hint itself:** Clerk auth (401) → `hasValidConsent` fail-closed (403
  `CONSENT_REQUIRED`) → rate limit 30 req/60s per user (429) → session/task existence (404) →
  crystal balance check (402 `INSUFFICIENT_CRYSTALS` only possible pre-stuck, since stuck = free).
- **Exact crystal numbers**: `stuck.ts`'s own docstring (line 11) states the hint historically cost
  5 crystals against a 3-crystal pass reward — I did not re-read `HINT_CRYSTAL_COST` /
  `TASK_PASS_CRYSTAL_REWARD` in `src/content/curriculum/types.ts` this pass, so treat "5 / 3" as
  **UNVERIFIED current values**, only verified as the documented rationale.
- **Tier-3 economy gate** (`tier-demand.ts`) is a separate, silent escalation: it can flip an
  already-passing `sequence-world` tier-3 attempt back to `pass:false` with a canned Russian string
  (duplicate step / too many steps) — and that flip **does** count toward the stuck counter above,
  since the hints route counts any `pass:false` row regardless of `reasonCode`. Currently unreachable
  in practice per the inconsistency noted in §1.

## 3. Pacing estimates (code-derived, explicitly not measured)

**Method (as specified):** reading time = words ÷ (75 words/min midpoint of the given 60-90
nsportal 3rd-grade range) = 0.8 s/word; + ~10 s per interaction; + ~3 s judge round-trip; ×1 retry
(second pass re-uses interactions + judge time but not full re-reading). Word counts are averages
per family from `evidence/research-2026-09-05/readability-ru.json`'s `promptRu` field (title/
explanation are session-level, read once, not counted per task).

Interaction counts are **estimated from the UI surface components**, not measured:
`GridDrawSurface.tsx` (click target cells, ~4/task), `SequenceSurface` (order ~5 steps),
`RuleSurface.tsx` (one control per distinct tile type derived from `ruleMaps`, ~2/task),
`PatternSurface.tsx` (numeric pair or ~3 cycle items), `ClaimSurface.tsx` (mark each claim, ~3/task).

| Family | Avg promptRu words | Est. interactions | 1 attempt | +1 retry | Min/task |
|---|---|---|---|---|---|
| grid-draw | ~10 | ~4 | 51 s | +46 s | ~1.6 |
| sequence-world | ~11 | ~5 | 62 s | +56 s | ~2.0 |
| rule-runner | ~11 | ~2 | 32 s | +26 s | ~1.0 |
| pattern-expand | ~12 | ~3 | 42 s | +36 s | ~1.3 |
| claim-check | ~7 prompt + **~15 unc­ounted claim text** ≈ 22 | ~3 | 51 s | +36 s | ~1.4 |

Claim-check caveat: `readability-ru.json` scans `titleRu/explanationRu/promptRu/hintRu/goalRu/
doneWhenRu` — it does **not** scan the `claims[].text` array, so the tool's own word counts
understate claim-check's true reading load by roughly the words in 3 claim sentences (~15 words,
counted by hand from `week-5/session-1.ts:23-37`). Flag this as a readability-tool gap, not just a
pacing footnote — any future word-budget work on claim-check should read `claims[]` too.

**Per-session / per-week roll-up** (tasks × family minutes/task):

| Week | Session mix | Min/session (approx) | Min/week (3 sessions) |
|---|---|---|---|
| 1 | grid-draw ×7 | 11.2 | 33.6 |
| 2 | sequence-world ×5 | 10.0 | 30.0 |
| 3 | rule-runner ×5 | 5.0 | 15.0 |
| 4 | pattern-expand ×5 | 6.5 | 19.5 |
| 5 | s1 claim-check(7.0) / s2 rule-runner(5.0) / s3 mixed(5.8) | — | 17.8 |

**Total ≈ 116 min across 81 tasks / 15 sessions ⇒ ~7.7 min/session average, ~23 min/week average.**

**Vs. norms (§4):** every modeled session (5-11 min) sits *under* the 10-20 min instructional-
segment guidance the attention-span research converges on. Two readings are both defensible and
worth a product decision rather than an automatic "fix":
- **Too short to be a coherent instructional unit** — a child may not warm up before the session
  ends, and 3 sessions/week at 5-11 min each is a lot of context-switching overhead relative to
  content.
- **Deliberately snackable, and that's a feature** — sub-10-minute blocks avoid the exact fatigue
  window the AAP's 2026 "5 Cs" reframe and the cognitive-load research both worry about, and match a
  parent's realistic daily window better than a 20-minute sit.
Given the estimate's own error bars (interaction counts are guessed, not measured), do not resize
sessions off this table alone — this is exactly what §6's instrumentation should confirm or refute
first with real dwell-time and attempt data.

**Rule-runner is the outlier low estimate (~5 min/session)** because its interaction model (pick an
action per abstract tile type) has the fewest clicks — but §5 argues rule-runner's *cognitive* load
(generalizing "if-then" across two unseen maps) is not proportional to its click count, so its true
child-minutes are likely undercounted more than any other family here.

## 4. Norms consulted (3 citations, WebSearch, 2026-09-05)

1. **Attention-span / instructional-segment length, ages 8-11:** convergent classroom guidance is
   **10-20 minute segments** before a break, shorter (10-15 min) for novel/complex content, longer
   (15-20+ min) for well-scaffolded/engaging material; the often-cited "age × 2-3 min" heuristic
   extends to ~16-33 min for this age band, though the review notes rigid numeric thresholds lack
   strong primary-data support. — [Breaking Up Long Class Periods to Maintain Students' Focus | Edutopia](https://www.edutopia.org/article/breaking-up-long-class-periods-maintain-students-focus/), [Maintain Your Students' Attention in Class - Waterford.org](https://www.waterford.org/blog/student-attention-span/), [The effectiveness of one "physical education minute" during lessons... 8- to 10-year-old schoolchildren (NCBI)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10668119/)
2. **Cognitive-load / worked-example guidance for novices:** novices learning a new concept need a
   **fully worked example before** being asked to generate a rule themselves (Renkl & Atkinson 2003
   fading-scaffold sequence: model → partially-worked → independent problem); unguided
   generation/inquiry tasks overload working memory for true beginners; support should fade as
   expertise grows ("expertise reversal effect"). Directly relevant to §5 findings #5 and #6 below,
   where the curriculum's first task in a new concept asks for a generalized rule with no worked
   example first. — [Cognitive Load Theory in practice: Worked examples & Completion tasks | InnerDrive](https://www.innerdrive.co.uk/blog/cognitive-load-theory-in-practice/), [An introduction to cognitive load theory - THE EDUCATION HUB](https://theeducationhub.org.nz/an-introduction-to-cognitive-load-theory/)
3. **Screen-time / educational-app guidance:** AAP's January 2026 update dropped fixed hour limits
   for ages 6-12 in favor of a "5 Cs" (Child, Content, Calm, Crowding-out, Communication) framework;
   curriculum-aligned learning apps are treated distinctly from recreational screens, and homework-
   style use is generally not counted against family screen-time limits — the operative question is
   whether the app crowds out sleep/activity/homework, not raw minutes. — [The AAP's new 2026 screen time guidelines, explained](https://www.prodigygame.com/main-en/blog/screen-time-aap-guidelines-2026), [Updated AAP recommendations for screen time: What parents need to know - CHOC](https://health.choc.org/updated-aap-recommendations-for-screen-time/)

## 5. Top-10 riskiest tasks — code-cited, with concrete fixes

1. **Claim about an unrendered image.** `src/content/curriculum/week-5/session-1.ts:20-38`
   (`w5s1-collision`): prompt says "Монстр уверенно говорит про картинку" and claims reference "верхний
   ряд", "закрашенные клетки" — but `ClaimSurface.tsx` (confirmed by reading it) renders only a text
   list of claims (`grid gap-2 sm:grid-cols-2`), no image/grid visual anywhere in the surface or task
   data. The child must judge true/false about a picture that does not exist on screen. **Fix:** add
   a static `gridSnapshot`/image field to the task and render it above the claims list (reuse
   `GridDrawSurface`'s read-only grid rendering), or rewrite the claims to reference something already
   on screen (e.g. the session's own goal text).
2. **"Карта" never drawn for rule-runner.** `src/content/curriculum/week-3/session-1.ts:20,32,44,56,68`
   all say "на двух картах" / "карте", but `RuleSurface.tsx` (confirmed lines 32-111) renders one
   control per abstract tile type (`open`/`wall`) pulled out of `ruleMaps` — never a spatial grid or
   path. The child reasons about a "map" that is pure text metadata. **Fix:** render a minimal
   read-only strip/grid showing the tile sequence per `ruleMaps[].id`, even schematically (a row of
   colored cells for open/wall/trap/goal), so "карта" has a referent.
3. **Numeric mode defaults on for a non-numeric pattern.** `src/components/curriculum/task-surfaces/PatternSurface.tsx:21`
   (`useState<"arithmetic" | "cycle">("arithmetic")`) — every pattern-expand task opens with the
   "Начальное число" / "Шаг" numeric fields shown first (lines 63-68), even for
   `week-4/session-1.ts`'s entire task set, which is symbolic drum/bead sounds
   (`patternExpected: ["тук","тук","хлоп",...]`, never numbers). A child must notice the radio toggle
   and switch to "cycle" mode before they can even start. **Fix:** default `kind` from the task's own
   data shape (symbolic `patternExpected` → default "cycle"), not a hardcoded constant.
4. **Invisible allowed-verb vocabulary.** `src/content/curriculum/week-2/session-3.ts:29-41`
   (`w2s3-collision`): child must decompose "собраться и выйти", but the monster's actual fixed verb
   set ("надеть, взять, открыть, выйти, закрыть") is only revealed in `doneWhenFullRu` — shown, per
   the codebase's pattern, only after an attempt. Nothing in `promptRu`/`hintRu` states the closed
   vocabulary upfront. **Fix:** surface the allowed-verbs list in the hint (or a one-time worked
   example) before the first attempt, not only as post-hoc feedback.
5. **Generalize-first, no worked example, on concept debut (rule-runner).**
   `week-3/session-1.ts:16-26` (`w3s1-collision`) is the *first* task of the "conditions" concept and
   already demands a self-generated general rule spanning two unseen maps ("Оно прогонится на двух
   картах"). Per the cognitive-load citation in §4.2, novices need a worked example before a
   generation task. No `WorkedExample.tsx` usage found wired to this session. **Fix:** insert a
   worked/modeled if-then example as task 0, or reframe `w3s1-collision` as "here's a rule, predict
   what happens on map 2" before asking the child to author one.
6. **Same gap on pattern-expand's debut.** `week-4/session-1.ts:18-32` (`w4s1-collision`) opens the
   "pattern" concept by asking for the general repeating rule immediately ("Скажи правило, из которого
   сами получатся пять ударов"), again with no preceding worked example. **Fix:** same pattern as #5 —
   show one fully-expanded example first, then ask for the rule.
7. **Two unrelated verification skills in one claim-check task.** `week-5/session-1.ts:41-64`
   (`w5s1-p1`) mixes a simple arithmetic fact ("2 + 2 = 4") with an abstract sequence-rule claim
   ("Правило «+1» даёт 1,2,3,4") in the same 3-claim set, with one generic hint ("Не верь тону —
   проверь каждое"). For an 8-year-old these are different reasoning moves (recall vs. rule-tracing)
   bundled without a transition. **Fix:** split into two claim sets, or add a claim-specific
   micro-hint distinguishing "check the math" from "check the rule."
8. **Tier-3 economy rule is invisible until failure.** `week-1/session-2.ts:91`,
   `week-1/session-3.ts:88,102` (tier-3 grid-draw tasks) — nothing in `promptRu`/`hintRu` tells the
   child tier 3 penalizes duplicate/extra steps; the child only learns the rule from
   `TIER_THREE_FEEDBACK` (`tier-demand.ts:31-34`) after a "pass" gets flipped to "fail." (Note: per
   §1, this specific mechanism is currently scoped to `sequence-world`, so these exact grid-draw
   tier-3 tasks are *not* actually gated by it — but the general pattern of "no upfront statement of
   the tier-3 bar" is the risk, and would bite the moment sequence-world tier-3 content is authored.)
   **Fix:** state the tier-3 constraint in the tier-3 prompt/hint copy itself.
9. **Scaffolding doesn't scale with tier inside rule-runner.** `week-3/session-1.ts:52-62`
   (`w3s1-p3`, tier 2, "Уточни правило так, чтобы на стене монстр не шагал") gets the same ~5-word
   hint style as every tier-1 task in the file (`hintRu` averages ~5.2 words/task across the whole
   session per the readability data, tier-agnostic). The harder conceptual move (tightening a rule
   rather than just stating one) gets no extra scaffolding. **Fix:** lengthen/specialize hints for
   tier ≥ 2 rule-runner tasks specifically, since this family has the flattest hint-to-difficulty
   curve of the five.
10. **Cross-week transfer with no vocabulary refresher.** `week-5/session-1.ts:116-138`
    (`w5s1-transfer`) asks the child to verify claims using week-4's pattern notation ("start=1
    step=1", "Цикл из двух цветов") a full week later, with only the generic hint "Как проверить, а
    не поверить?" — no recap of what "start/step" or "цикл" meant. **Fix:** one-line vocabulary recap
    in the hint for any `role: "transfer"` task that reaches back more than one week.

## 6. Instrumentation plan — replace these guesses with `TaskAttempt`/`ConceptMastery` data

`prisma/schema.prisma`: `TaskAttempt` (`userId, concept, family, tier, pass, eventId, sessionId,
taskId, createdAt`, indexed on `[userId, concept]` and `[userId, sessionId]`) and `ConceptMastery`
(`userId, concept, mastery, intervalStep, nextReviewAt, updatedAt`, unique on `[userId, concept]`).

**What's aggregable today, no schema change:**
- Attempts-per-task and fail-rate: `GROUP BY sessionId, taskId` → `count(*)`, `sum(pass=false)::float/count(*)`.
  Directly replaces §5's guessed risk list with a real ranked table.
- Retry depth: count consecutive `pass:false` rows per `(userId, sessionId, taskId)` ordered by
  `createdAt`, to check whether the "1 retry average" assumption in §3 is anywhere close to true, or
  whether the stuck-at-2/3/4 copy in `stuck.ts` is actually firing at the rates its design assumes.
- Concept-level drift: weekly average `mastery` and `intervalStep` per `concept` from
  `ConceptMastery`, to see which of the 5 families is systematically under-mastered across the pilot
  cohort (a low `mastery` + rising `intervalStep` = spaced-repetition signal of real struggle, not
  guessed abstraction risk).

**What's missing and needs a small addition:**
- **Hint-use rate per task:** `TaskAttempt` has no hint flag. The crystal ledger
  (`spendCrystalsForHint`) records the spend event but wasn't cross-referenced this pass — either
  join that ledger by `(userId, sessionId, taskId)` in the report query, or add a `hintUsed Boolean`
  column to `TaskAttempt` for a one-query answer.
- **Time-to-first-attempt / dwell time:** `TaskAttempt.createdAt` only marks when an attempt was
  *submitted*, not when the task was first *viewed* — there is no "task rendered" event anywhere in
  the schema. Without it, §3's reading-time estimates cannot be checked against reality.

**3 concrete cron/report additions:**
1. **Weekly hardest-tasks report** — cron aggregates `TaskAttempt` fail-rate + (once joined) hint
   uptake per `(sessionId, taskId)`, ranks descending, replaces §5's top-10 with measured data.
2. **Weekly concept-mastery drift report** — cron aggregates `ConceptMastery.mastery`/`intervalStep`
   per `concept` per cohort-week, flags any concept trending down or with rising `intervalStep`
   across multiple children (a family-level, not single-task, signal).
3. **Add a `TaskView` event (or `viewedAt` column) + weekly time-to-first-attempt report** — smallest
   viable addition: one insert when a task surface mounts. Until this exists, every pacing number in
   §3 stays a code-derived guess; this is the one gap that actually blocks measuring whether real
   session length matches or misses the §4 norms.

## 7. Sources
- [Breaking Up Long Class Periods to Maintain Students' Focus | Edutopia](https://www.edutopia.org/article/breaking-up-long-class-periods-maintain-students-focus/)
- [Maintain Your Students' Attention in Class - Waterford.org](https://www.waterford.org/blog/student-attention-span/)
- [The effectiveness of one "physical education minute" during lessons to develop concentration in 8- to 10-year-old schoolchildren (NCBI)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10668119/)
- [Cognitive Load Theory in practice: Worked examples & Completion tasks | InnerDrive](https://www.innerdrive.co.uk/blog/cognitive-load-theory-in-practice/)
- [An introduction to cognitive load theory - THE EDUCATION HUB](https://theeducationhub.org.nz/an-introduction-to-cognitive-load-theory/)
- [The AAP's new 2026 screen time guidelines, explained](https://www.prodigygame.com/main-en/blog/screen-time-aap-guidelines-2026)
- [Updated AAP recommendations for screen time: What parents need to know - CHOC](https://health.choc.org/updated-aap-recommendations-for-screen-time/)

## 8. UNVERIFIED — explicit list
- `HINT_CRYSTAL_COST` / `TASK_PASS_CRYSTAL_REWARD` exact current numeric values (only the rationale
  "~5 cost / 3 reward" from `stuck.ts`'s docstring was seen, not the live constants).
- Whether `uxV11Enabled()` (`src/lib/ux-flags.ts`, not read this pass) defaults on in production —
  if off, the free-after-stuck hint mechanism in §2 does not actually activate.
- Whether any skip-task mechanism exists anywhere else in the repo (only 3 files were checked for
  the escalation contract).
- Exact per-task interaction-click counts in §3 are estimated from reading the surface components'
  structure, not from executing/measuring the app — genuine dwell-time telemetry (§6 item 3) is the
  only way to confirm or replace them.
- `week-5/session-3.ts`'s 2 claim-check tasks were not read directly this pass (only their
  `family`/`tier` lines via grep) — the "картинка not rendered" pattern in finding #1 was confirmed
  only for `w5s1-collision`, not exhaustively for every claim-check task in the curriculum.
