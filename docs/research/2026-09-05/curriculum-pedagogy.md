# Curriculum pedagogy vs. evidence — 8-11 cohort (2026-09-05)

Repo evidence used: `docs/canon/MINDSHIFT-PRODUCT-CANON-V1.md` §4 (arc + pedagogy rules),
`docs/architecture/08-UX-MONSTER-JOURNEY.md` §10 (current UX decision, overrides §4/§5),
`src/content/curriculum/week-1/session-1.ts` (grep `role:`), `src/lib/tasks/stuck.ts`,
`src/lib/tasks/tier-demand.ts`.

Confirmed role sequence, w1-s1: `collision → practice → practice → practice → practice →
practice → transfer`. No `Возврат`-shaped role exists in this file, and no `prediction` role
appears in it either (task-role taxonomy per prompt includes prediction; not present here —
UNVERIFIED whether other 14 sessions use it).

## 1. Verdict per arc phase

**Возврат (return/activation)** — *conditionally supported*. Rosenshine's Principle 1 is
literally "begin each lesson with a short review of previous learning," 5-8 min (Rosenshine,
2012, *American Educator*). Direct child-age evidence: Karpicke, Blunt & Smith (2016) ran
retrieval practice on 88 children, mean age 10, and found robust retrieval-practice effects
independent of reading comprehension/processing speed — this is our exact cohort. The *phase*
is well supported. The *implementation* is not: w1-s1 has no retrieval task instantiating it,
and the new intro screen only narrates "story," it does not test recall. Gap between named
canon phase and shipped mechanic.

**Столкновение (collision before explanation)** — *conditionally supported*, see §2 below.

**Разбор (explicit sense-making after collision)** — *supported*. This is Kirschner, Sweller &
Clark's (2006) prescribed "guidance that fully explains concepts and procedures," and
Rosenshine's Principles 4/6 ("provide models and worked examples," "check for understanding").
It is also Kapur's own precondition: productive failure only pays off when explicit
consolidation instruction follows the failed attempt (Sinha & Kapur, 2021, *Review of
Educational Research*). The canon's fixed ordering (Столкновение *then* Разбор, never skipped)
is what keeps this arc on the right side of both camps.

**Практика (guided/repeated practice)** — *supported*. Rosenshine Principles 2, 5, 7, 9 (small
steps, practice after each step, high success rate, monitored independent practice). w1-s1's
five consecutive `practice` roles match "practice after each step" directly. The tier ladder's
fading worked example (open → folded → none) is the textbook fading-of-guidance pattern from
the worked-example/expertise-reversal literature (Kalyuga, Ayres, Chandler & Sweller, 2003).

**Перенос (transfer)** — *conditionally supported*. Transfer is the outcome variable Sinha &
Kapur (2021) actually measured for PS-I designs, so a transfer task is the right idea. But it
fires same-session, immediately after practice — that is near-transfer under low delay, weaker
evidence than the spaced/delayed transfer the retrieval-practice and spacing literature
(Dunlosky et al., 2013) says produces durable learning. No later-week task revisits this
transfer target.

**Итог (reflection + praise)** — *conditionally supported*, contingent on copy not verified this
pass. Canon: praise fires immediately after Перенос — timing matches feedback-effectiveness
research (Hattie & Timperley, 2007) which says feedback should attach to the point of
performance. But Hattie & Timperley's central finding is that *generic* praise ("well done") is
low-value because it carries no task-relevant information, while praise tied to the specific
process/strategy the child used is what moves learning. Whether the shipped copy is specific or
generic is UNVERIFIED — not grepped this pass.

## 2. Collision-first vs. explanation-after — which side of Kirschner vs. Kapur

Kirschner, Sweller & Clark (2006) argues against *minimal guidance with no subsequent explicit
instruction* (pure discovery/constructivist/unassisted PBL), not against productive struggle
per se. Kapur's productive-failure design is explicitly PS-I: problem-solving **followed by**
instruction, never alone. Sinha & Kapur's 2021 meta-analysis (53 studies, 166 comparisons) found
PS-I beats instruction-first, Hedge's g = 0.36 overall, rising to 0.37-0.58 under high design
fidelity — but the age breakdown favors **secondary school and older**; younger/elementary
learners show a weaker effect, plausibly because they extract less signal from failed attempts
unaided (search-engine summary of the paper — exact effect-size-by-age figures UNVERIFIED,
primary text not fetched).

So: our arc is on the *defensible* side of this debate, but only because Разбор is mandatory
and immediate, never optional — that is precisely the design condition under which Kirschner's
objection does not apply and Kapur's own evidence requires. The new intro screen (goal + «Готово,
когда» shown before the board, explanation folded after task 1) is consistent with this: showing
the *goal* before struggle is not the same as showing the *method* before struggle, and Kirschner's
critique targets missing guidance on method/procedure, not missing goal-framing. Folding the
concept explanation after task 1 (not deleting it, not making it optional past a miss — per
§10.2/§10.3 of the UX doc, the full condition expands after a miss) keeps a guidance floor under
the child, which is exactly what the age-attenuated Kapur evidence says 8-11-year-olds need more
of than teenagers do.

The one place this reasoning gets shakier: since the effect is weaker for this age band to begin
with, collision-first should not be applied with equal confidence to every week. Weeks that
extend an already-built mental model (week 2 decomposition, building on week 1 precision) are
safer for collision-first than weeks that introduce a wholly new model with high intrinsic
cognitive load (week 3 conditions, week 4 pattern) — see fix #6 below.

## 3. Tier ladder vs. expertise-reversal evidence

Match is good in direction, unverified in detail. The expertise-reversal effect (Kalyuga, Ayres,
Chandler & Sweller, 2003) predicts exactly this shape: worked examples help novices and become
neutral-to-harmful as competence rises, so instructional support should fade as the ladder is
climbed — tier 1 open example, tier 2 folded, tier 3 none is the correct direction of fade. Two
caveats: (a) expertise reversal is normally studied as a within-domain competence progression
inside one extended practice sequence, not as a three-discrete-tier assignment per task attempt
— whether tier assignment in this codebase tracks actual demonstrated competence per family
(not just attempt count) was not verified this pass; (b) `tier-demand.ts` shows a *second*,
independent tightening at tier 3 (no duplicate/no excess steps, `sequence-world` only) — this is
an economy constraint, not a guidance-fading constraint, and stacking both on tier 3
simultaneously (example removed AND stricter answer required) could compound load right at the
point competence is least certain for an 8-11 novice who only just reached tier 3. Recommend
confirming, from `TaskAttempt` history, that tier-3 access already implies demonstrated fluency
before adding the economy gate on top of the missing worked example.

## 4. Is one hint + escalation-after-2 enough

Partially. `stuck.ts` is well-aligned with one piece of evidence and silent on another. Aligned:
free-hint-after-2-misses matches the "spend before struggle-and-help" scaffolding literature's
general shape — help arrives sooner and costs nothing once struggle is confirmed by data, and the
copy softens ("это нормально", "непростая задача") rather than shaming, which fits the SDT
motivation lens (competence support without threatening autonomy — Ryan, Rigby & Przybylski,
2006, though that paper studies general video-game motivation, not an ed-tech child sample
specifically — UNVERIFIED as a direct match). Not aligned: the ladder only escalates *cost* and
*tone* (2/3/4+ failures get warmer language and a free price), never *content specificity* — the
hint itself does not become more explicit. Scaffolding-fade research (the same
Kalyuga/Sweller expertise-reversal family, plus classic Wood & Bruner scaffolding) supports a
ladder that reveals progressively more of the solution (nudge → partial worked step → full worked
step) rather than a binary priced/free single hint. For 8-11 children specifically, a child stuck
a 4th time on the same fixed-text hint has no new information — only reassurance — which risks
frustration without resolving the actual impasse.

## 5. Six structural fixes, ranked

1. **Add a real Возврат retrieval task at session start, every session after w1-s1.**
   `src/content/curriculum/week-2/session-1.ts` through `week-5/session-3.ts`; role taxonomy in
   `src/content/curriculum/types.ts`. Cites: Rosenshine (2012) Principle 1; Karpicke, Blunt &
   Smith (2016). Biggest gap: canon names this phase, code has no task role for it.
2. **Specific-praise templates for the Итог/post-Перенос message**, following the fixed-string
   pattern already used in `src/lib/tasks/tier-demand.ts` (`TIER_THREE_FEEDBACK`). Exact praise
   copy file not located this pass — grep for the post-transfer celebration string before
   implementing. Cites: Hattie & Timperley (2007).
3. **Spaced/interleaved review item in week N+1, session 1**, one task instance reusing week N's
   family/world. `src/content/curriculum/week-2/session-1.ts` .. `week-5/session-1.ts`. Cites:
   Dunlosky et al. (2013); Agarwal et al. (2014, exam-anxiety finding, retrieval practice does
   not increase stress).
4. **Graduated hint content, not just price**, in `src/lib/tasks/stuck.ts` — add a
   partial-reveal step between "free hint" and "same hint again." Cites: Kalyuga, Ayres,
   Chandler & Sweller (2003) fading logic, applied to hints instead of worked examples.
5. **Explicit contrast/comparison sub-step inside Разбор** for collision tasks (show the child's
   attempt next to the correct one, not just the correct one) to raise fidelity to Kapur's PF
   design, since the age-band effect is already weaker without it. Exact Разбор render location
   not grepped this pass — confirm before implementing. Cites: Sinha & Kapur (2021).
6. **Don't apply collision-first uniformly across weeks** — for a week introducing a genuinely
   new mental model (`week-3` conditions, `week-4` pattern) add a one-line worked micro-example
   before the very first collision task; keep pure collision-first for weeks extending a known
   model (`week-2` decomposition after `week-1` precision). Cites: Kirschner, Sweller & Clark
   (2006) on novice cognitive load; Sinha & Kapur (2021) age-attenuation.

## 6. Sources

- Kirschner, P. A., Sweller, J., & Clark, R. E. (2006). Why Minimal Guidance During Instruction
  Does Not Work. *Educational Psychologist*, 41(2), 75-86.
  https://www.tandfonline.com/doi/abs/10.1207/s15326985ep4102_1
- Sinha, T., & Kapur, M. (2021). When Problem Solving Followed by Instruction Works: Evidence
  for Productive Failure. *Review of Educational Research*.
  https://journals.sagepub.com/doi/10.3102/00346543211019105
- Rosenshine, B. (2012). Principles of Instruction. *American Educator*, 36(1), 12-19, 39.
  https://www.aft.org/ae/spring2012/rosenshine
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The Expertise Reversal Effect.
  *Educational Psychologist*, 38, 23-31 — summarized via
  https://en.wikipedia.org/wiki/Expertise_reversal_effect
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013).
  Improving Students' Learning With Effective Learning Techniques. *Psychological Science in
  the Public Interest*, 14(1), 4-58. https://journals.sagepub.com/doi/abs/10.1177/1529100612453266
- Karpicke, J. D., Blunt, J. R., & Smith, M. A. (2016). Retrieval-Based Learning: Positive
  Effects of Retrieval Practice in Elementary School Children.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4786565/
- Hattie, J., & Timperley, H. (2007). The Power of Feedback. *Review of Educational Research*,
  77(1), 81-112. https://journals.sagepub.com/doi/abs/10.3102/003465430298487
- Ryan, R. M., Rigby, C. S., & Przybylski, A. (2006). The Motivational Pull of Video Games: A
  Self-Determination Theory Approach. *Motivation and Emotion*.
  https://link.springer.com/article/10.1007/s11031-006-9051-8 (UNVERIFIED as a children/ed-tech-
  specific sample — general population study).
- Grover, S., & Pea, R. (2013). Computational Thinking in K-12: A Review of the State of the
  Field. *Educational Researcher*, 42(1), 38-43.
  https://journals.sagepub.com/doi/abs/10.3102/0013189x12463051
- Pugnali et al. (2017) ScratchJr/tangible-robotics kindergarten comparison — cited via a 2026
  Wiley systematic review summary, not fetched directly this pass; UNVERIFIED primary source.

## 7. UNVERIFIED

- Exact effect sizes and age cutoffs in Sinha & Kapur (2021) — taken from a search-engine
  summary of the paper, not the fetched primary text.
- File(s) rendering post-Перенос praise copy, and whether current copy is generic or specific.
- Exact component rendering the Разбор phase (name only, from canon; not grepped).
- Whether the worked-example open→folded→none tier behavior lives in a single identified file
  beyond `tier-demand.ts` (which implements a different, economy-based tier-3 gate).
- Whether any of the other 14 sessions use the `prediction` role, or instantiate a Возврат-like
  task — only `week-1/session-1.ts` was grepped, per task scope.
- Ryan & Rigby SDT source is a general video-game-motivation study, not a children's-ed-tech-
  specific SDT paper; no closer match surfaced in the searches run this pass.
- Whether tier assignment (1/2/3) is driven by demonstrated per-family competence or by session/
  attempt count alone — relevant to whether stacking the tier-3 economy gate on top of the
  missing worked example (§3) is a real risk or a non-issue.
