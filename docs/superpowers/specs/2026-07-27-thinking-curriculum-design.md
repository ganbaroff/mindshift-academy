# MindShift Academy — Thinking Curriculum Redesign

**Date:** 27 July 2026
**Status:** design, awaiting owner approval
**Supersedes:** the 5-lesson core loop in `docs/architecture/04-CURRICULUM-AND-CONTENT.md`

## 1. The problem, with evidence

The current course is completable in under ten minutes and teaches close to nothing. Three
independent causes, all verifiable in the code:

**The task states its own answer.** `getIntroductionText` in `src/app/lesson/[id]/page.tsx`
hands the child the solution. Lesson 1 asks for three qualities and supplies
`"храбрый, быстрый, весёлый"`. Lesson 3 states the cipher rule to be written. Lesson 5
supplies the full conditional: `"ЕСЛИ впереди стена, ТО поверни налево, иначе иди вперёд"`.
Copying the example passes. Three of five lessons are transcription exercises.

**One correct message closes a lesson.** A reward is granted on the first accepted turn
(`modalShouldOpen`), and the next lesson opens at `highestCompleted + 1`
(`maxUnlockedLesson`). Five messages complete the course.

**The offline judge is open.** `checkChallengeSuccess` in `src/lib/progression.ts` passes
lesson 1 on any three words longer than one character, and passes lesson 4 if the message
contains the substring `"не"` — present in most Russian sentences.

Underneath these: no repetition, no transfer, no return to earlier material, no per-concept
mastery in the student path. `LessonProgress.completed` is a boolean. The five skills do not
build on one another; lesson 5 requires nothing from lessons 1–4.

The engine is not the problem. Chat, moderation, COPPA consent, rewards, and progression are
sound. The teaching is missing.

## 2. Fixed decisions

Settled with the owner before design; not open for reinterpretation during implementation.

| Question | Decision |
|---|---|
| Audience | Children 8–14, reached through a consenting parent. Unchanged. |
| Subject | Thinking and logic, with AI as the instrument. Broader than prompt engineering. |
| Length | Five weeks, three sessions per week, 15–20 minutes per session. |
| Payment | Deferred. Content first. No checkout work in this scope. |
| The ten waiting users | Free beta. Feedback is the deliverable they owe back. |
| Language | Russian only. |
| Age handling | Difficulty adapts to measured mastery, not to a declared age. |
| Content authoring | Written in this project; the owner reviews the finished result. |
| LLM | Existing Azure GPT deployment. |
| Unlocking | By completion, at the child's own pace, within the content released so far. |

The last row resolves an apparent conflict. Pace is free, but weeks are authored
sequentially, so a child cannot run past unwritten material. This is stated to families as a
weekly rhythm, which is true rather than a retention device.

## 3. The pedagogical mechanism

**The monster does exactly what it is told.** It does not guess, infer, or extend charity to
an imprecise instruction. Vague thinking therefore produces a visible, usually funny, wrong
outcome, and the child sees the gap between what they meant and what they said. This is both
the teaching mechanism and an honest model of how a language model actually behaves.

Four properties follow, and each one is absent today:

1. **The task must not contain its answer.** Targets are drawn from a randomized family, so
   nothing in the prompt can be copied and no two attempts are identical.
2. **One success is not mastery.** A skill must be performed several times, at rising
   difficulty, before it counts.
3. **Transfer is required.** The same skill must be applied in a visibly different setting.
   This is the difference between understanding and imitation.
4. **Earlier material returns.** Concepts resurface after growing intervals until stable.

## 4. Curriculum spine

Five weeks, one thinking skill each, three sessions per week. Every week names the
misconception it exists to destroy, because a lesson that does not change a belief is
decoration.

### Week 1 — Точность (precision)

An instruction that can be read two ways will be read the wrong way.

The child describes a pattern or figure; the system renders literally what was said beside
the target. Disagreement is visible and not arguable.

*Misconception:* «монстр догадается, что я имел в виду».

### Week 2 — Разбиение на шаги (decomposition)

A large task is small ordered tasks, and order decides the outcome.

The child writes a step list; the monster performs it literally and in sequence. A wrong
order or a missing step produces an absurd visible result rather than a scolding.

*Misconception:* «шаги можно перечислить в любом порядке, и так понятно».

### Week 3 — Условия и крайние случаи (conditions and edge cases)

A rule must answer every case, including the inconvenient one.

The child's rule runs against several maps, one of which is chosen to break a rule that only
works on the obvious case. This is the repaired form of the present lesson 5: an example
copied from the task cannot pass, because it fails a later map.

*Misconception:* «сработало на одном примере — значит работает всегда».

### Week 4 — Повторение и закономерность (repetition and pattern)

Instead of listing items, state the rule that generates them.

The child describes a pattern; the system expands it far beyond the visible examples and
compares against the expected continuation.

*Misconception:* «описал три элемента — описал закономерность».

### Week 5 — Проверка и отладка (verification and debugging)

The payload week, and the one with lifelong value: **an AI can be confidently wrong.**

The monster produces a plausible false claim, and the child must design a check that catches
it. Then, given a failing rule and the case it failed on, the child must locate the fault and
repair it minimally rather than rewrite it.

*Misconception:* «если ИИ ответил уверенно, значит правильно».

## 5. Session structure

Every session follows one arc, so the child learns the shape and spends attention on the
content rather than the interface.

1. **Возврат** (~2 min) — one review item from an earlier week, selected by the spacing
   schedule. This is the retention mechanism, not a warm-up.
2. **Столкновение** (~3 min) — the child attempts the task before any explanation, and it
   fails instructively. Productive failure before instruction retains better than
   explanation first.
3. **Разбор** (~3 min) — a short explanation of the principle, anchored to the failure that
   just happened.
4. **Практика** (~5–7 min) — two or three tasks in the same skill at rising difficulty, each
   checked deterministically.
5. **Перенос** (~3–5 min) — the same skill in a visibly different context.
6. **Итог** (~1 min) — the child states the rule in their own words. This is the one place
   where judging free text is legitimate.

## 6. Executable task engine

The core mechanism, and the part that removes subjective grading from the progression gate.

```
child's Russian instruction
        │
        ▼
  INTERPRETER (LLM, temperature 0)   → structured program, literal
        │
        ▼
  EXECUTOR (pure function, no LLM)   → outcome
        │
        ▼
  CHECKER (pure function)            → pass/fail + a diff the child can read
```

**The interpreter must be literal, and this is the single greatest technical risk.** A
language model's instinct is to be helpful: given an incomplete instruction it will silently
supply the missing step, which destroys the entire pedagogy. It is therefore instructed to
emit only what was stated, to never infer an omitted step, and to mark ambiguity rather than
resolve it. Spelling and grammar errors are tolerated — the audience is eight years old —
but logical gaps are preserved exactly.

This property is enforced by a fixture suite of known-ambiguous inputs with expected literal
parses, run in CI. If the interpreter starts repairing instructions, the tests fail loudly,
because every downstream claim about learning would then be false.

**Executors are pure and deterministic.** Five task families cover all five weeks:

| Family | Produces | Weeks |
|---|---|---|
| `grid-draw` | cells filled from instructions, compared to a target figure | 1 |
| `sequence-world` | ordered actions in a small world with preconditions | 2 |
| `rule-runner` | an agent driven by the child's conditional rules across N maps | 3, 5 |
| `pattern-expand` | a pattern rule expanded to N terms | 4 |
| `claim-check` | the child's check applied to true and false claims | 5 |

**The checker returns a readable diff, not a verdict.** «Ты сказал: …; получилось: …;
ожидалось: …», and for rules, the specific case that failed. The diff is the teaching
material; a bare "неверно" teaches nothing.

Because executor output is deterministic and generated by our own code, it needs no output
moderation, which removes both a cost and a safety surface compared to free tutor text.

## 7. Verification and the progression gate

| What is judged | How | Gates progress? |
|---|---|---|
| Practice and transfer tasks | deterministic executor + checker | **yes** |
| The child's own formulation of the rule | LLM judge | no — affects reward quality only |
| Conversational encouragement | tutor LLM | no |

Progression depends only on deterministic checks. Two consequences: the course cannot be
passed by producing text that merely resembles the skill, and the course still works when no
LLM is reachable for judging. The gameable `checkChallengeSuccess` fallback is deleted rather
than patched, because with a deterministic gate it has nothing left to approximate.

## 8. Mastery, spacing, and difficulty

Mastery is per concept, not per lesson, and is already modelled in the schema:
`ConceptMastery(userId, concept, mastery)` was added in the Atlas learning sprint and is
currently unused by the student path. This design finally connects it.

- Mastery moves on deterministic outcomes, weighted by the difficulty tier passed.
- Each task family has three tiers. The tier offered is selected by current mastery, which is
  how one course serves both an eight-year-old and a fourteen-year-old without asking either
  of them to declare an age.
- Spacing uses widening intervals per concept: a concept answered correctly moves to a longer
  interval, a concept missed returns to the shortest. The **Возврат** step draws from
  whichever concept is due.
- A session is complete when its practice and transfer checks pass at the required tier.

Schema addition: `ConceptMastery` gains `nextReviewAt DateTime?` and `intervalStep Int
@default(0)`. No new table; the spacing state belongs to the concept it describes.

Format selection during **Разбор** — explanation, drill, or flashcards — is decided by local
code in this repository, from the same mastery value. It is deliberately *not* delegated to
the Atlas `nba-engine` over `/api/learning/decide`, even though that engine exists and does
this well, because a child's lesson must not fail when a staging service is unreachable. Atlas
stays advisory: it may later observe outcomes and propose better selections, but it never sits
on the path a child needs to finish a session.

## 9. Content as data

Content stops being persona strings and becomes typed data, so that authoring a week does not
mean editing application code:

```
src/content/curriculum/week-<N>/session-<M>.ts
```

Each session declares: the concept id, the misconception, the collision task, explanation
copy, the practice tasks (family, tier, target generator), the transfer task, the review pool
it contributes to, and the rubric for the closing formulation. `curriculum.ts` becomes a
loader and a validator over this tree instead of a source of truth for lesson text.

A build-time validator rejects a session that lacks a misconception, a transfer task, or a
deterministic check, so the failure mode that produced the current course — a lesson that
only looks like a lesson — cannot recur silently.

## 10. Parent-facing value

The weekly email in `src/emails/weekly-report.tsx` currently reports lessons completed out of
five. It gains: mastery per thinking skill, the skill the child struggled with most, and one
**question to ask at dinner** derived from that skill. This is cheap to build, is the part a
parent can act on, and is the natural basis for charging later.

## 11. Delivery against the deadline

The owner has 1–2 weeks and ten waiting families. Five weeks of authored content cannot be
written well in that window, and quality is the thing being repaired.

**Ships in the deadline:** the engine (interpreter, five executors, checkers), the
progression gate, mastery and spacing, the content schema and validator, Week 1 complete
(three sessions), the interpreter fixture suite, and the extended parent report.

**Ships weekly thereafter:** Weeks 2 through 5, one per week, each behind the same validator.

Families are told the truth: sessions open in a weekly rhythm, at their own pace within what
is open.

## 12. LLM usage and cost

Per child attempt: one moderation call on input, one interpreter call. Per session: roughly
ten to fourteen attempts, plus one judge call for the closing formulation, plus tutor replies
for encouragement. Existing calls are small — the tutor is capped at 150 tokens and the judge
at 120.

Cost is therefore dominated by conversational tutor text, not by the new interpreter, and
sits on the order of cents per session per child at the current deployment. A per-session
token budget is enforced so that a child who retries thirty times cannot produce an unbounded
bill; on exceeding it the session degrades to deterministic checks with canned encouragement,
which is a graceful and pedagogically harmless failure.

## 13. Testing

- **Executors and checkers:** pure unit tests, exhaustive on edge cases. No LLM, no network.
- **Interpreter literalness:** fixture suite of ambiguous and incomplete instructions with
  expected literal parses. This is the guard on the pedagogy and runs in CI.
- **Progression gate:** a session cannot complete without passing deterministic checks;
  asserted offline.
- **Content validator:** a session missing a misconception, transfer task, or deterministic
  check fails the build.
- **End to end:** one full session, warm-up through closing formulation.

Existing CI already runs unit, build, and e2e jobs on `main` with branch protection, so these
land in a pipeline that will actually enforce them.

## 14. Risks, and what would falsify this design

| Risk | Response |
|---|---|
| The interpreter repairs incomplete instructions | Fixture suite in CI; prompt forbids inference. **If it cannot be made reliably literal at acceptable cost, the youngest tier falls back to a constrained block-based input instead of free text.** This is the designated retreat, decided now rather than under pressure. |
| Latency per attempt harms the experience | Interpreter is a small call at temperature 0; the monster shows a thinking state; executors are instant. |
| Eight-year-olds' spelling defeats parsing | Interpreter tolerates orthography and preserves logic; fixtures include misspelled inputs. |
| Free text is too hard for the youngest | Same block-based fallback as above. |
| Five weeks of content is underestimated | Weekly release with a validator; Week 1 is proven before Weeks 2–5 are written. |
| Wide age band makes one course fit nobody | Difficulty tiers driven by measured mastery, not declared age. |

## 15. Out of scope

Payment and checkout. Azerbaijani or English locale. Voice. Mobile app. Leaderboards or
social features. Any content beyond Week 5. Changes to consent, moderation, or authentication.
