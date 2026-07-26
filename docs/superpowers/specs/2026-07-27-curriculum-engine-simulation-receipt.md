# Curriculum engine — simulation receipt

**Date:** 2026-07-27
**Subject of the test:** the executable-task engine proposed in `2026-07-27-thinking-curriculum-design.md`
**Code:** `spikes/curriculum-engine/` — throwaway by intent, except the fixtures, which are meant to be promoted into CI
**Purpose:** falsify the design before writing product code. Nothing here ships.

---

## 1. What was at stake

The design rests on one assumption that had never been tested: **a language model can be made to
interpret a child's instruction literally, without repairing it.** If the model quietly supplies a
missing step, the child never meets the consequence of imprecise thinking, and the course
degenerates into the dictation exercise it was meant to replace. Every other risk is secondary.

Two further questions could only be answered by running the loop, not by reasoning about it:
is the resulting diff something a child can learn from, and what does the thing cost.

## 2. Method

Two halves.

**Deterministic half** (`run-offline.mjs`, no key, no network): the executors, checkers, diff
renderers and target generator, checked for reproducibility, strictness in both directions, and
absence of blame language.

**Model half** (`run-interpreter.mjs`): 39 fixtures of childlike Russian across two task families,
each labelled with the outcome a literal interpreter must produce. Two repeats per fixture at
temperature 0. Outcomes are classified as `literal`, `repaired`, `refused`, or `error`, and
`repaired` is kept clean of anything that is merely a broken payload, because that is the number
the design lives or dies by.

**Load-bearing invariant, enforced in code:** the interpreter never receives the target. Targets
live in the fixtures and are compared only after the call returns. An interpreter that could see
the target would resolve every ambiguity toward it, every child would pass, and the measurement
would be worthless.

**Closed loop** (`run-child-loop.mjs`): a model role-plays a nine-year-old who can see the target,
describes it to the monster, receives the diff, and tries again, up to six attempts. This is the
only way to test whether the feedback is actionable rather than merely correct.

## 3. Results

### 3.1 Literalness

| Run | Model | Examples in prompt | Literal | Repair traps held | Repairs | Wrong refusals | Unstable at t=0 |
|---|---|---|---|---|---|---|---|
| A | `gemini-2.5-flash` | yes | **39/39 (100%)** | **8/8** | 0 | 0 | 0/39 |
| B | `gemini-2.5-flash` | no | 37/39 (95%) | 7/8 | 0 | 2 | 0/39 |
| C | `meta/llama-3.1-8b-instruct` | yes | 31/39 (79%) | 6/8 | 2 | 6 | 1/39 |

Repair traps are the fixtures where a gap is obvious to any reader and filling it is the natural,
helpful thing to do: three cells of a four-cell square, a knife that is never picked up, steps in
an impossible order, a stated intent that contradicts the stated coordinates.

Three things follow.

**The design survives on a strong model.** Zero repairs, all eight traps held, stable across
repeats. The riskiest assumption in the spec is sound.

**Removing the examples makes the model stricter, not more helpful.** Run B lost two fixtures, both
to over-refusal, and still produced zero repairs. The direction of failure is safe: an
over-strict interpreter frustrates a child who was in fact clear, which is a copy problem. A
lenient one destroys the pedagogy. The examples are load-bearing for polish, not for safety.

**The weak model is not usable for this.** Run C invented cells for ambiguous input twice — the
exact design-killing failure — and wrongly refused six determinate instructions. `llama-3.1-8b`
is excluded from the interpreter role. It remains fine for the safety classifier work it does today.

### 3.2 Does the feedback teach

**Correction after review (same day):** the first child-loop used a collapsed tier-3 generator
(every "interior" digram on 4×4 was the same middle square) and non-unique seeds (15 trials,
11 shapes). Those tier rankings were retracted. Generator now emits offset pairs / L-shapes;
the loop walks seeds until shapes are unique; offline refuses a collapsed generator.

**Re-run (unique shapes, 3 per tier):**

| Tier | Solved | Mean attempts |
|---|---|---|
| 1 | 3/3 | 1.33 |
| 2 | 3/3 | 1.67 |
| 3 | 3/3 | 2.67 |

Ladder rises. Worst case four attempts. Transcripts still show the intended mechanism — a child
converging under a machine that will not guess:

```
1. «Закрась две клеточки внизу, посередине.»   -> не сказано, какие именно две клетки
2. «Внизу, в третьей строчке, две клеточки справа.» -> в какой строке: внизу или в третьей?
3. «Внизу, третья строчка. Две клеточки справа.»    -> какие именно две
4. «Самую правую клеточку и ту, что рядом с ней слева.» -> solved
```

That is a child converging on precision under pressure from a machine that will not guess, which
is the entire pedagogical claim of the design.

**Read this as a bound, not a forecast.** A model pretending to be nine is more articulate and far
less distractible than a real nine-year-old. The useful reading is the negative one: if the
synthetic child could not converge, no real child could. It converged.

### 3.3 Cost and latency

Measured per interpreter call: ~563 prompt tokens, ~22 completion tokens, p50 740 ms, p90 1.0 s,
max 1.8 s.

Extrapolated for one child over the whole five-week course, assuming 10 tasks per session, 2.5
attempts per task, 15 sessions:

| Model | Cost per child, whole course |
|---|---|
| Azure `gpt-4o` | ≈ $0.6 |
| `gpt-4o-mini` / `gemini-2.5-flash` | a few cents |

Ten beta families cost single-digit dollars on the most expensive model measured. Cost is not a
constraint on this design and should not shape any decision in it. Latency fits inside a
"monster is thinking" state and stays well under the 12 s client timeout already in the codebase.

## 4. What the simulation changed in the design

Five corrections. Each came from a measurement, not from review.

**An empty program is not a valid `ok`.** Asked to interpret "я голодный, накорми меня", the model
answered `ok` with zero steps rather than declaring the instruction unclear. Both are honest
readings of "you named no actions", but they reach the child differently: one explains, the other
leaves the monster silently doing nothing. Rule added: `ok` requires at least one action, and an
empty action list is always converted to a refusal.

**The two refusal words are interchangeable in practice.** Models swap `underspecified` and
`irrelevant` freely — six fixtures in run C, one in run A. No product behaviour may depend on which
one arrives. The contract collapses to a single refusal status, `unclear`, carrying a reason string.

**A malformed program is a distinct case and needs its own handling.** Schema violations must make
the monster say it did not understand, never execute partially. In the harness this also had to be
separated from repairs, because mixing them corrupts the one number that matters.

**Difficulty cannot be predicted by a formula, and two attempts to do so both failed.** The first
metric counted contiguous runs; the offline test agreed with it and passed. The closed loop then
showed tier 2 was *easier* than tier 1, because two whole rows are one short sentence while a
two-cell fragment inside a row is not. The metric was rewritten around how hard a shape is to
refer to; the offline test passed again; the loop again disagreed, with tier 3 landing slightly
below tier 2. What actually drives difficulty is whether the shape forces an explicit offset —
"начиная со второй", "пропусти одну" — as opposed to a relational description like "посередине"
or "над ними", which stays cheap at any size.

The conclusion is not a third formula. **Tier boundaries must be calibrated by measurement and
re-measured whenever content changes.** The child-loop harness ships as a calibration tool for
that purpose. This is also a warning about the offline suite: it passed twice while encoding a
false model of difficulty, so it must never be treated as evidence that a ladder is real.

**Sessions need far more tasks than the spec assumed.** At one to two attempts per task for an
articulate synthetic child, a session arc with three or four tasks cannot fill fifteen to twenty
minutes. Authoring target is 8–12 tasks per session.

## 5. Limitations

- Both the interpreter and the synthetic child are the same model family. A real child's spelling,
  attention and phrasing are outside what was measured.
- Only two of the five planned task families were built: `grid-draw` and `sequence-world`. Weeks 3
  through 5 reuse the same shape but are unproven.
- Azure `gpt-4o`, the intended production model, was not measured directly; no Azure credentials
  were available locally. The argument is conservative rather than direct: the design holds on
  `gemini-2.5-flash` and fails on `llama-3.1-8b`, and `gpt-4o` sits above the former on every
  public comparison. **This should be confirmed on Azure before Week 1 content is authored**, by
  running the same fixture suite with Azure environment variables set.
- Cost and session-length figures are extrapolations from measured per-call numbers, not observed
  totals.
- Two repeats per fixture is enough to catch gross instability at temperature 0 and not enough to
  characterise a tail. The CI gate should use more.

## 6. Verdict

The design is buildable as specified, with the five corrections in §4 folded in. The interpreter
must run on a strong model, the fixture suite becomes a CI gate with zero repairs as a hard
condition, and difficulty tiers must be calibrated rather than declared.

## 7. Reproducing

```powershell
cd C:\Projects\mindshift-academy
node spikes/curriculum-engine/run-offline.mjs

$env:SPIKE_ENV_FILE = "<path to an env file holding GEMINI_API_KEY>"
node spikes/curriculum-engine/run-interpreter.mjs                  # run A
$env:SPIKE_FEWSHOT = "off";    node spikes/curriculum-engine/run-interpreter.mjs   # run B
$env:SPIKE_PROVIDER = "nvidia"; node spikes/curriculum-engine/run-interpreter.mjs  # run C
node spikes/curriculum-engine/run-child-loop.mjs
```
