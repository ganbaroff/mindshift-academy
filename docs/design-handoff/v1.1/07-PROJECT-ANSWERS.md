# Answers to the 30 questions

Answered 2026-08-07. Each answer is tagged:
**[FACT]** — already true in the shipped code, not open to design ·
**[DECIDED]** — our decision, firm ·
**[PROPOSAL]** — our current thinking, argue with it ·
**[OWNER]** — the founder's call, not answered here.

## Content and subject

**1. Are the five skills a layer over any subject, or maths/language/logic?** [FACT + DECIDED]
A universal layer. Nothing in the engine knows a school subject: the five task families are
`grid-draw`, `sequence`, `rule`, `pattern`, `claim`, and the subject matter is whatever the task
text describes (a sandwich, a shape, a route). The skill being trained is *phrasing an
instruction precisely enough that a literal machine does what you meant*. Sandwiches and grids
are carriers, not curriculum.

**2. Who writes the tasks?** [OWNER]
Today: the founder plus AI drafting, no methodologist. This is the single biggest content risk
and it is an open hiring/commissioning question. What we can say: the *format* is now fixed
(see §2 of `docs/architecture/08-UX-MONSTER-JOURNEY.md`), so a writer can be handed a template
rather than a blank page.

**3. How many tasks are needed for production?** [FACT]
Not 5×5. The course is **5 weeks × 3 sessions = 15 sessions**, and a session holds **4-6 tasks**,
so roughly **60-90 tasks total**. All 15 sessions exist in `src/content/curriculum/week-N/session-M`
today and pass an automated content matrix (97 checks green). The gap is quality, not quantity.

**4. One task format for the MVP, or several?** [FACT]
Five already exist and all five ship: draw-on-a-grid, assemble-a-sequence, state-a-rule,
continue-a-pattern, make-a-claim. Each week leans on one. There is also a free-text fallback on
every task ("сказать своими словами"). No new format is needed for the MVP.

**5. Same material for all 8-13, or age tracks?** [FACT + PROPOSAL]
One material, three difficulty **tiers** per task, already in the engine (`tier` on every task,
`effectiveTaskTier`, cross-session mastery in `src/lib/tasks/mastery.ts`). There is no age track
and we do not propose one: age is a bad proxy for skill, and a tier the system infers from
performance is both fairer and already built.

## Levels and progression

**6. What moves a child to the next week — a count or mastery?** [FACT]
Mastery, not a count. A session closes when its **required roles** pass — every session has a
mandatory `transfer` task and a set number of `practice` passes. Failing forward is impossible;
skipping does not close a task (see Q7).

**7. Can a week be rushed, or is every session mandatory?** [DECIDED]
Every session is mandatory, but nothing is timed and there is no "speed" reward. Skipping a task
inside a session is allowed and never punished — it simply leaves that task open, and the session
does not read as complete. Nothing anywhere rewards going faster.

**8. What if the child is away for days — frozen or rolled back?** [DECIDED, and a live contradiction]
**Frozen. Never rolled back.** Progress is derived from what was actually passed
(`src/lib/tasks/resume.ts`), so absence cannot subtract anything.
**However:** the code today has `Monster.mood` with the schema comment *"Drops if user misses a
day (Loss Aversion)"* and a live nightly job (`src/app/api/cron/mood-decay/route.ts`) that lowers
it and warns the parent. That contradicts everything above and is flagged for the founder — see
`06-MONSTER-ANATOMY-ANSWERS.md` §4. Design as if it is gone; we intend to retire it.

**9. Are five weeks the whole course, or does a new cycle follow?** [OWNER]
Five weeks is the whole product today. A second cycle is wanted but unscoped and unwritten. Do
not design for it, but do not design anything that makes it impossible either — in particular,
do not treat week 5 as a permanent ending screen.

**10. How many tasks per cluster, and does the child see a number?** [FACT + DECIDED]
A cluster is one week = 3 sessions ≈ 12-18 tasks. The child sees **no numbers**: position inside
a session is shown as unlabelled progress marks, and the map shows stops, not counts. Numeric
progress invites comparison and speed-running, both of which we are avoiding.

## Monster and growth

**11. Are the five parts fixed forever?** [PROPOSAL]
Fixed for this course. A second cycle would add a new *kind* of growth (colour, texture, a
companion) rather than more limbs — five limbs is already the readable ceiling on a 320px screen.

**12. What happens to the monster between cycles?** [PROPOSAL]
The same monster gains the next layer. It is one creature per child for the life of the account
(`Monster.userId @unique`), and starting a fresh monster would throw away the only emotional
asset we have.

**13. Can a "half-grown" monster ever appear in the parent's report?** [DECIDED]
Yes, and it must — the report shows the monster exactly as it is today, mid-growth. That is not
a shameful state, it is the progress itself. The iron rule is different: **no part is ever
removed**, and the report never frames the missing parts as a deficit ("осталось 3 из 5" is
banned; "на этой неделе появились уши" is the register).

**14. Is the species a one-time choice?** [FACT]
There is no species choice today. At hatching the child picks a **name, a colour and an emoji**
(`Monster.name/emoji/color`, all required). Those stay changeable in principle; growth is
attached to the account, not to the appearance, so a later restyle would not cost the child
anything. We do not plan a species picker.

## Difficulty and adaptivity

**15. Are hints and re-asks the same for every child?** [PROPOSAL]
Re-asks: identical for everyone, because they are deterministic and depend only on what the child
typed. Hints: same text, different *availability* — the first hint of a session becomes free once
the child has failed twice, which is the adaptivity that matters. Difficulty itself already adapts
through tiers (Q5).

**16. What counts as "stuck" beyond two failures — is there escalation?** [PROPOSAL]
Two failures on one task: the monster names it and offers its hint, free, unprompted. Third
failure: the monster shows *what it would do* and asks the child to confirm or change one thing —
still not a solution handed over. Fourth: it offers to leave the task open and come back, phrased
as a choice, never as a verdict. No modal at any point.

**17. Is there a hint ceiling?** [DECIDED]
Paid hints (5 gems) are limited only by the child's gems. The **free** stuck-hint is one per task,
unlimited across the session — a child who is stuck on every task needs help on every task, and
rationing that would punish exactly the child we are trying to keep.

## Assessment and data

**18. What is recorded about a child?** [FACT]
`TaskAttempt` stores: task id, session id, concept, family, tier, pass/fail, and a timestamp.
**No child text is stored anywhere** — the model has no field for it, by design, and the same is
true of `FormulationSubmission`. So: attempt counts and pass/fail are available, coarse timing is
derivable from timestamps, and error *type* is not stored beyond the task family.

**19. Does the child need any metric — streak, score?** [DECIDED]
No. The monster is the only progress signal the child sees. Gems exist but buy exactly one thing
(hints) and are not framed as a score. No streak — a streak is a loss-framing device with a
friendly face.

**20. How is success judged on free text?** [FACT]
It is fully graded, not decorative. Free text goes through `interpretUtterance`
(`src/lib/tasks/interpreter.ts`) and the same pass/fail path as the structured surface, after
moderation. One rule we are adding: while a re-ask is open, the next submission — from either
surface — answers the re-ask and is not scored.

## Parent

**21. What does the parent see, and how often?** [FACT]
A dashboard they can open at any time, plus a weekly summary. No push notifications to the child,
ever.

**22. Can the parent intervene?** [FACT + DECIDED]
Today they can revoke consent (which stops everything immediately) and delete all child data.
They **cannot** skip a week or reset progress, and we do not want to add that: it turns a child's
own path into something an adult edits. Detailed per-error visibility is also deliberately absent
— the parent sees progress and effort, not a transcript of their child's mistakes.

**23. Is the parent-facing monster a progress passport or a marketing surface?** [DECIDED]
A passport, strictly. Nothing about it may be shareable, exportable, or comparable with other
families — our consent regime forbids social surfaces, and a monster designed to be shown off
would quietly turn a child's learning into a parent's status object.

## Onboarding and the first day

**24. When does the child name the monster?** [FACT]
Before the first task, on a dedicated onboarding screen: hatch, then name, colour and emoji, then
the first session. Already built (`src/app/onboarding/page.tsx`).

**25. Is a UI tour needed?** [DECIDED]
No tour. If a screen needs explaining to an 8-year-old, the screen is wrong. The monster's first
line does the only teaching there is.

**26. What does a first-ever visitor see?** [FACT]
An egg and a hatching, then the naming screen, then session 1 — and, once the resume fix lands,
never that entry point again: a returning child lands on their current stop.

## Technical and reach

**27. Platform?** [FACT]
Mobile web only. Next.js, no native app, no offline mode. Assume a cheap Android browser on a
home connection. No gestures beyond tap; nothing may depend on hover or drag.

**28. Does the child have a login?** [FACT]
No. The parent holds the account (Clerk). The child enters an **8-character code** once at
`/enter-code`; the alphabet deliberately excludes `0/O/1/I/L`. This is also why that input is the
single most important control in the product to get right — it is the only thing standing between
a child and their first lesson, and today its boxes are 30px wide on a 320px screen.

**29. Is speech needed for weaker readers?** [FACT]
Text-to-speech already exists (`/api/tts`) and is consent-gated like everything else. It is
currently a hint-reading aid. Extending it to read the monster's lines is wanted, especially for
8-year-olds; treat audio as an addition to text, never a replacement.

**30. What if a child does not pass a week for months?** [PROPOSAL + OWNER]
There is no product-level answer today, and UI hints will not solve it. Our proposal: after a
long absence the monster greets them by name, the current stop is re-entered at a lower tier
(the engine already supports tiers), and the parent's weekly summary says plainly that the child
is stuck on one idea and suggests doing that one session together. No re-engagement emails to the
child — there is no channel to a child, and there should not be one.

## The three questions we would ask back

1. Who writes the 60-90 tasks to the new template, and by when? (Q2 — the real bottleneck.)
2. Do we retire mood decay? Until that is decided, two parts of this document contradict.
3. Is there a second cycle after week 5, or does the product end there? Q9 and Q11-12 hang on it.
