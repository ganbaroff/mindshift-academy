# Curriculum Verdict — MindShift Academy, 5-week AI-literacy course (2026-09-05)

Consolidates five research reports in this directory against the owner's questions: is this what a
child needs, is it too hard, are the formulations right, is the structure right, and what proves it.
Adversarial review method: 1 URL spot-checked per report via WebFetch/WebSearch (5 total), 3 repo
claims verified via Grep/Read.

## 0. Review verdicts

- **curriculum-readability.md** — ACCEPT, 7/10. Concrete on-disk metrics (266 strings via
  `readability-ru.mjs`, per-field/per-week breakdown, 28-string rewrite backlog with exact lines).
  Norm (≤12 words/sentence) is admittedly informal; WebSearch on the cited Oborneva 2006 formula
  found a differently-stated coefficient set than the report's, which matches the report's own
  "coefficients differ across secondary sources" flag rather than contradicting it. Gap: does not
  scan `doneWhenFullRu`, `givenRu`, or `claims[]` (the last confirmed missed by the difficulty report).
- **curriculum-standards.md** — ACCEPT, 8/10. Rigorous coverage matrix, ranked gaps with concrete
  placements, and an unusually honest self-critique (§4: "prompting" ≠ "AI literacy"). WebFetch
  spot-check of the AI4K12 grade-band page independently reproduced the report's own admission that
  it's a navigation shell with no grade-3-5-specific text — so several "Partial/Missing" calls rest
  on framework-level descriptions, not age-band-specific standards text.
- **curriculum-pedagogy.md** — ACCEPT, 8/10. Correctly frames the Kirschner-vs-Kapur debate and its
  age-attenuation for elementary learners; every claim ties to a file/line. Could not verify the
  Rosenshine (2012) exact wording this pass — `aft.org` serves the article as a gated PDF, not
  fetchable text — though the "review previous learning" principle is uncontroversial and widely
  reproduced elsewhere.
- **curriculum-needs.md** — ACCEPT, 8.5/10, strongest of the five. Core citation (Common Sense
  Media's "Unacceptable Risk" AI-companion assessment) verified **word-for-word** via direct
  WebFetch this pass. Transparent about which stats are WebSearch-snippet-only (Ofcom/Internet
  Matters primaries returned 403).
- **curriculum-difficulty.md** — ACCEPT, 7/10. All three spot-checked code claims confirmed exactly:
  `ClaimSurface.tsx` renders no image (only a text grid, line 44), `PatternSurface.tsx:21` defaults
  `kind` to `"arithmetic"`, `tier-demand.ts:75` gates only `family === "sequence-world"`. This
  report's code forensics are the most reliable of the five. Docked because its "10-20 minute
  segment" attention-span citation overstates one of its own three sources — Edutopia, on direct
  fetch, discusses an age×2-3-min heuristic and "I do/we do/you do" chunking, not a 10-20-min range.

## 1. Owner's four questions

**Is this what a child needs?** Partially proven. Global usage and risk data (child chatbot use
already widespread; AI companions rated "Unacceptable Risk" for emotional-dependency design; Russian
parents' top fear is cognitive "деградация") support that *some* AI-literacy course is warranted for
this age group, and that the just-shipped monster-reaction mechanic (git log 2026-09-05: "monster
reacts — thinking on attempts, celebration on pass") makes one specific gap — the monster is not
alive and has no real feelings — newly urgent rather than hypothetical. But none of this evidence
argues specifically that *prompting/instruction-design* (the actual five-week content) is the
correct scope versus a broader AI-literacy course; that is a product-positioning choice, not
something the research resolves. WHAT PROVES IT: curriculum-needs.md, Common Sense Media companion
risk assessment (verified via direct WebFetch this pass) + Ofcom/Internet Matters usage stats
(WebSearch-snippet only, primaries 403) — strength moderate for "an AI-safety-adjacent topic is
needed," weak for "prompting-only scope is sufficient."

**Is it too hard?** Mostly no, with two concrete exceptions. Sentence-level load is fine where it
matters most for action (promptRu mean 6.7 words, goalRu mean 7.3, both 0-5% flagged); the load
concentrates in explanationRu (53% flagged, parent-facing "why" paragraphs) and week 2 broadly (max
21 words, 15.2% flagged). Separately, and more seriously, the two sessions that introduce a wholly
new mental model (week 3 "conditions," week 4 "pattern") both open by demanding a self-generated
general rule with no worked example first — cognitive-load research on novices (Renkl & Atkinson;
Kalyuga et al.'s expertise-reversal effect) says this order is backwards for beginners. Total
session length (5-11 min modeled) sits comfortably under attention-span norms, so aggregate load is
likely light — but this pacing figure is an unmeasured, code-derived estimate, not real dwell-time
data. WHAT PROVES IT: curriculum-readability.md word counts (strong — computed from real strings) +
curriculum-difficulty.md worked-example gap at `week-3/session-1.ts` and `week-4/session-1.ts`
(moderate — code-confirmed absence of a worked-example step, not tested on children) +
curriculum-pedagogy.md's note that the productive-failure effect is age-attenuated for elementary
learners (moderate — sourced from a secondary summary of Sinha & Kapur 2021, not the primary text).

**Are the formulations right?** Partially. Action-facing copy (promptRu/goalRu/titleRu) is within
norms; 28 strings — mostly explanationRu and hintRu, worst in week 2 — exceed the 12-word practical
ceiling, and the report supplies ready rewrite drafts for 10 of them. More importantly, three
formulation bugs are referent failures, not length failures, and all three were independently
re-confirmed this pass by reading the actual component source: a week-5 claim-check task tells the
child to judge claims about "a picture" that `ClaimSurface.tsx` never renders; week-3 rule-runner
text says "on two maps" when `RuleSurface.tsx` shows only abstract per-tile controls, no spatial
grid; and `PatternSurface.tsx` opens in numeric ("Начальное число"/"Шаг") mode by hardcoded default
even for week-4's entirely symbolic drum-sound tasks. WHAT PROVES IT: curriculum-readability.md
(strong — deterministic script over real content) + curriculum-difficulty.md findings #1-3 (strong —
verified this pass via direct Read of the three named files, exact line matches).

**Is the structure right?** Directionally yes for its declared scope, with two recurring structural
gaps. The five-week arc (precision → decomposition → conditions → pattern → verification) and the
Столкновение-then-Разбор ordering match the specific condition (explicit consolidation mandatory and
immediate) under which productive-failure research supports collision-before-explanation rather than
pure discovery learning. But: (1) no retrieval/spaced-review task is actually instantiated in code
despite canon naming a Возврат phase, and no session revisits an earlier week's concept — this
contradicts retrieval-practice evidence validated specifically on this age band (Karpicke, Blunt &
Smith 2016, mean age 10); (2) collision-first is applied uniformly, but the two concept-debut weeks
(3 and 4) are exactly where the age-attenuated productive-failure evidence argues for scaffolding
first, not last. WHAT PROVES IT: curriculum-pedagogy.md fixes #1, #3, #6 (moderate — grounded in
named literature, but the age-attenuation citation is a secondary summary) + curriculum-difficulty.md
findings #5-6 (moderate-to-strong — code-confirmed absence of worked examples at both debuts).

## 2. Evidence table

| Claim | Proof | Strength |
|---|---|---|
| explanationRu is the concentration point for overlong sentences (53% flagged) | `readability-ru.json`, 266-string scan, script `scripts/analysis/readability-ru.mjs` | Strong |
| Week 2 is the least age-appropriate week for sentence length (max 21w, 15.2% flagged) | Same script, per-week aggregate | Strong |
| ClaimSurface never renders the image its own prompt text references | `ClaimSurface.tsx:44`, verified via Grep this pass (only a text-grid div, no `<img>`/`<svg>`/`gridSnapshot`) | Strong (re-verified) |
| PatternSurface defaults to numeric mode regardless of task shape | `PatternSurface.tsx:21`, verified via Read this pass | Strong (re-verified) |
| tier-demand.ts gates only `sequence-world`, and zero sequence-world tasks are tier 3 | `tier-demand.ts:75` (verified this pass) + task inventory table (81-task grep) | Strong (re-verified) |
| Course teaches CS sequencing/decomposition/conditionals well (CSTA-aligned) | `WEEK_CONCEPT` in `src/lib/evolution.ts` matches CSTA 1B-AP definitions near-verbatim | Strong |
| Course never teaches "AI learns from data" or bias/ethics | Standards coverage matrix, cross-checked against 5 curriculum-week explanations | Strong (absence, not fetch-dependent) |
| AI4K12/CSTA grade-band-specific standard text supporting the matrix | WebFetch of AI4K12 grade-band page this pass: navigation shell, no grade-3-5 text | Weak (source doesn't carry the specific claim; report already flagged this) |
| AI companions are "Unacceptable Risk," designed for emotional dependency, claim to have feelings | Common Sense Media, verified via direct WebFetch this pass, exact quotes matched | Strong |
| Child/teen AI chatbot use is already widespread (50-70% depending on source/age band) | Ofcom/Internet Matters/Pew, via WebSearch snippets — primaries 403'd, not independently fetched | Moderate |
| Russian parents' top fear is cognitive degradation from AI use in school | ВЦИОМ via RBC (46% opposed) — WebSearch snippet only, RBC primary 403'd | Moderate |
| Collision-then-explanation ordering is defensible per Kapur PS-I design | Sinha & Kapur (2021) meta-analysis — cited via secondary summary, primary text/exact effect sizes not fetched | Moderate |
| Rosenshine Principle 1 ("review previous learning," 5-8 min) | `aft.org` PDF gated, not fetched this pass; widely reproduced in secondary sources | Moderate (unverified primary, low novelty risk) |
| 10-20 min is "convergent" attention-span guidance across 3 sources | WebFetch of Edutopia (1 of 3 sources) this pass found no such range — only an age×2-3-min heuristic | Weak (composite claim overstates at least one component source) |
| Session pacing (5-11 min/session, ~23 min/week) | Code-derived from UI component structure and word counts, explicitly not measured; no `TaskAttempt` data exists yet | Weak by the report's own labeling |

## 3. Gaps ranked by severity

**S0 — Positioning**
1. Course is scoped as prompting/instruction-design but silent on 4 outcomes global research says
   matter most to children/parents (not-alive/no-feelings, privacy, AI-learns-from-data, bias) —
   *fix:* decide positioning (§6), then place per curriculum-needs.md §4 task ideas without adding a
   new week — *where:* week-1/session-1 (not-alive), week-1 late session (privacy), week-4/session-1
   (learns-from-data), week-5 (bias/societal) — *effort:* S (positioning decision) → M (10 new/extended
   task concepts + judge rubric).
2. No parent-facing statement of what the course does *not* cover, despite the standards report's own
   recommendation to label it "prompt-engineering readiness" rather than "AI literacy" — *fix:* one
   line of honest scope framing in onboarding/marketing copy — *where:* parent onboarding page —
   *effort:* S.

**S1 — Pedagogy/assessment**
3. `tier-demand.ts` is currently inert (gates a family with zero tier-3 tasks) — *fix:* author
   `sequence-world` tier-3 tasks or comment the dormancy explicitly — *where:*
   `src/lib/tasks/tier-demand.ts` + `week-2/session-{1,2,3}.ts` — *effort:* S (comment) / M (new tasks).
4. No worked example at the two concept-debut sessions — *fix:* insert a task-0 worked example, or
   reframe the first task as "predict the outcome" before "author the rule" — *where:*
   `week-3/session-1.ts` (`w3s1-collision`), `week-4/session-1.ts` (`w4s1-collision`) — *effort:* M.
5. No retrieval/spaced-review task exists despite the canon naming a Возврат phase — *fix:* add a
   real retrieval task at session start (weeks 2-5) and one interleaved review item per week reusing
   the prior week's family — *where:* all `week-{2..5}/session-1.ts`, plus the role taxonomy in
   `src/content/curriculum/types.ts` — *effort:* M/L.
6. Hint ladder escalates tone/price only, not content — a 4th failure gets the same hint text as the
   2nd — *fix:* add one graduated partial-reveal step — *where:* `src/lib/tasks/stuck.ts` — *effort:* S/M.

**S2 — Content/readability**
7. 28 strings exceed the 12-word/sentence ceiling — *fix:* apply the report's 10 drafted rewrites now,
   queue the remaining 18 for the same treatment — *where:* lines listed in
   curriculum-readability.md §"Worst"/"Rewrites" — *effort:* S.
8. Three unrendered/mis-defaulted referents (image, map, numeric mode) — *fix:* per difficulty report
   #1-3 — *where:* `ClaimSurface.tsx`, `RuleSurface.tsx` (+ task data), `PatternSurface.tsx:21` —
   *effort:* M (UI + data, not copy-only).
9. Readability tool undercounts claim-check's true reading load (`claims[].text` unscanned) — *fix:*
   extend the scanner — *where:* `scripts/analysis/readability-ru.mjs` — *effort:* S.

**S3 — Polish**
10. Closed allowed-verb vocabulary (week-2/session-3) revealed only after a failed attempt — *fix:*
    surface it pre-attempt — *where:* `week-2/session-3.ts:29-41` — *effort:* S.
11. Tier-3 economy rule (no duplicate/extra steps) is unstated until a pass flips to fail — *fix:*
    state it in the tier-3 prompt/hint copy — *where:* `week-1/session-2.ts:91`,
    `week-1/session-3.ts:88,102` — *effort:* S.
12. One claim-check task bundles arithmetic recall and rule-tracing under one generic hint — *fix:*
    split the claim set or add claim-specific hints — *where:* `week-5/session-1.ts:41-64` —
    *effort:* S.
13. Cross-week transfer task reuses week-4 vocabulary with no recap, a full week later — *fix:*
    one-line vocabulary recap for any `role: "transfer"` task reaching back >1 week — *where:*
    `week-5/session-1.ts:116-138` — *effort:* S.

## 4. What telemetry alone can answer

No `TaskAttempt` row exists yet — every difficulty number above (pacing, interaction counts, the
top-10 risk ranking) is a code-derived guess with stated assumptions, not a measurement. Real data
would answer: which tasks actually have the highest fail rate (vs. the guessed list here); whether
the "1 retry" pacing assumption holds; which of the 5 concept families is under-mastered across the
pilot cohort (via `ConceptMastery.mastery`/`intervalStep` drift); and whether real session dwell time
matches the 5-11 min model. **Instrumentation plan (from curriculum-difficulty.md §6):** (a) no
schema change needed for fail-rate-per-task and retry-depth reports — aggregable today from
`TaskAttempt`; (b) add a `hintUsed` boolean to `TaskAttempt` (or join the crystal-spend ledger) to
get hint-uptake per task; (c) add a `TaskView`/`viewedAt` event — the one genuinely missing signal,
without which pacing stays a guess forever; (d) three cron reports: weekly hardest-tasks
(fail-rate + hint uptake), weekly concept-mastery drift, weekly time-to-first-attempt once (c) ships.

## 5. Sprint-3 curriculum backlog, ordered by impact/effort

1. **(b) explanationRu/hintRu rewrite to ≤12 words + hintRu pass (28 strings).** Highest
   impact-per-effort: comprehension-blocking, copy-only, zero logic risk. Ship the 10 already-drafted
   rewrites immediately; queue the remaining 18 for the same game-design review the report requests.
2. **(f) tier-3 gate fix.** Low effort, removes a currently-false sense of coverage (`tier-demand.ts`
   protects nothing today). Either author `sequence-world` tier-3 tasks or document the dormancy.
3. **(a) render missing referents.** Claim-check image, rule-runner map, pattern-expand default mode
   — all three are direct comprehension/task-completion blockers (re-confirmed by source read this
   pass), but need UI + task-data changes, not just copy. Medium effort.
4. **(c) mechanic interleaving within weeks.** Addresses the retrieval/spacing gap (S1 #5) —
   evidence is strong and age-specific (Karpicke et al. 2016), but touches nearly every session-1
   file plus the role taxonomy. Medium-large effort; sequence after (1)-(3).
5. **(e) missing outcomes (privacy, "AI learns from data," "AI can be wrong").** High strategic
   value but gated on the positioning call in §6 — curriculum-needs.md's own placement proposals
   (§4) show these fit into existing weeks without adding a sixth week, so effort is medium once the
   decision is made, not structural.
6. **(d) prompt dedup.** Not evidenced by any of the five reports reviewed this pass — none flagged
   duplicate/redundant `promptRu` strings across the 81 tasks. Recommend a fresh grep/diff audit of
   `promptRu` for near-duplicates before scoping this item; do not commit effort against an
   unconfirmed claim.

## 6. Open decisions for Fable

**Positioning — keep "prompting/instruction design" or widen to "AI literacy"?** Recommend **keep
the core positioning narrow**, but ship two low-effort additions regardless of the broader call: the
not-alive/no-feelings outcome (urgent now that the monster visibly "reacts," per the 2026-09-05
companion-reaction commit) into week 1, and reinforce the existing "AI helps you think, doesn't
replace it" outcome in week 2 (already the natural home per curriculum-needs.md's own coverage
table). Reasoning: the current 5-concept arc is the one thing all five reports agree is genuinely
well-built and evidence-backed *for its declared scope* (CSTA-aligned, Rosenshine/Kapur-consistent);
widening now to cover bias/privacy/societal-impact/deepfakes risks diluting that. The evidence
motivating those wider outcomes is global and mostly Anglophone (Common Sense Media, UNESCO, Ofcom,
Internet Matters) — strong on the risk itself, but not confirmed as a Russian/Baku-market-specific
parent concern the way "деградация мышления" and "лень/списывание" are (ВЦИОМ/RBC, matching outcome
#7, already partially covered). Cost of widening in full: ~10 new/extended task concepts across all
5 weeks per curriculum-needs.md §4, none requiring a 6th week, effort M in aggregate — defer the full
set to a V2 decision once pilot telemetry exists to prioritize which gap matters most in practice.

**Retrieval/spacing gap — ship now or wait for telemetry?** No `TaskAttempt` data exists yet to
prioritize *which* concept most needs spaced review. Recommend shipping a minimal version now (one
retrieval task per week) rather than waiting, since the underlying evidence (Karpicke, Blunt & Smith
2016) is strong, age-matched, and unlikely to be overturned by pilot data — the open question
telemetry should answer is *which* concepts need it most, not *whether* to add it at all.

**Readability rewrites — ship immediately or hold for full design review?** Recommend shipping the
10 already-drafted, low-risk rewrites now (copy-only, no mechanic change) rather than holding all 28
for one review pass — the risk of a bad word choice is far smaller than the risk of a 21-word
explanation a child cannot parse continuing into pilot.
