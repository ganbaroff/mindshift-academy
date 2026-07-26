# Thinking curriculum — implementation plan

**Date:** 2026-07-27
**Design:** `docs/superpowers/specs/2026-07-27-thinking-curriculum-design.md`
**Evidence:** `docs/superpowers/specs/2026-07-27-curriculum-engine-simulation-receipt.md`
**Status:** plan, awaiting owner decisions in §1

This plan is written after the simulation, not before it, so the sequencing reflects what was
measured rather than what was hoped. Read the receipt first; several decisions here only make
sense in the light of it.

---

## 1. Decisions needed before any code is written

Three of these are blocking. They are not engineering choices.

**1.1 The legal gate.** `HANDOVER-2026-07-18.md:85-87` and `RELEASE-STATUS-2026-07-24.md:76` both
state that production use with real children is blocked pending a human lawyer's sign-off on the
consent and privacy copy. The ten waiting families are real children. Either the sign-off happens
before the beta opens, or the beta runs on something other than real children's accounts. This is
the owner's call and it gates the delivery date, not the build.

**1.2 Superseding the old roadmap.** `MODULE-1-LAUNCH-PLAN.md:97-107` lays out Modules 2 through 5
as a prompt-engineering track with PvP arenas and monster evolution. The new curriculum replaces
that subject matter. Unless the old roadmap is explicitly marked superseded, the next person to
read the docs receives two incompatible instructions. One line in that file, once.

**1.3 Interpreter provider.** The interpreter needs a strong model: `gemini-2.5-flash` held all
eight repair traps, `llama-3.1-8b` invented cells twice. Proposal: Azure `gpt-4o` as primary with
`gemini-2.5-flash` as fallback, matching `getChatClient()`'s existing precedence, and
`llama-3.1-8b` excluded from this role. Both providers are already disclosed to parents, so **no
consent version bump is required** — which would otherwise force all ten families to re-consent.
Adding any undisclosed provider later does force that bump.

## 2. Constraints inherited from the existing system

Not open for renegotiation by this work. Listed because the interpreter introduces a **new egress
path for a child's free text**, and every rule below already applies to such a path.

- Consent gate on every child-data route, resolving to "not consented" on any error
  (`COPPA-CONSENT-SPEC.md:76-77`). The interpreter route is one of these.
- Two independent classifiers on child input, fail closed, and the tutor model is never the sole
  safety decision-maker (`RELEASE-STATUS-2026-07-24.md:31`). Input moderation runs *before*
  interpretation, not after.
- Upstash-backed rate limiting, 503 rather than fail-open when Redis is absent
  (`DEPLOY-CHECKLIST.md:29-35`).
- Message text is not stored (`COPPA-CONSENT-SPEC.md:84`). Mastery records store concepts and
  outcomes, never the child's words.
- Never red, never blame language (`02-PRODUCT-AND-UX.md:6-12`). Already enforced by an offline
  check in the spike and to be carried into the product tests.
- Animations under 800 ms, `prefers-reduced-motion` respected, 44 px targets.
- `npm run verify:release` is extended, never weakened.

Two consequences worth stating because both are easy to get wrong later:

**The grid is display-only, deliberately.** A tappable grid would let the child point instead of
speak, which removes the entire skill being taught. It also happens to keep the screen inside the
"max five tappable elements" rule (`02-PRODUCT-AND-UX.md:18-20`). If someone later proposes making
cells clickable as a usability improvement, that is a pedagogy change, not a UI change.

**Nothing the model writes reaches the child.** The action vocabulary is a whitelist, so executor
output is our own text and needs no output moderation. The one leak in the spike's contract was the
free-text `reason` on a refusal, which was model-generated Russian shown to a child. §4.1 closes it.

## 3. Phase 1 — deterministic engine

No model, no network, no UI. This is the part the simulation proved and the part everything else
sits on.

**Build:** `src/lib/tasks/` — family registry; `grid-draw` and `sequence-world` executors, checkers
and diff renderers, ported from `spikes/curriculum-engine/lib/`; Zod contracts for programs and
verdicts; seeded target generation.

**Gate:** the offline suite becomes `npm run test:tasks`. Determinism over 200 runs, strictness in
both directions, out-of-bounds reported and never clamped, no blame language in any rendered diff.

**Done when** every check in `run-offline.mjs` passes as a product test and no LLM code exists in
this directory.

## 4. Phase 2 — interpreter behind the safety boundary

**Build:** `src/lib/tasks/interpreter.ts` on `getChatClient()`, temperature 0, JSON response
format, existing 12 s timeout and zero SDK retries. Order of operations per attempt: consent check,
rate limit, input moderation (fail closed), interpret, validate schema, execute, check, render.

**4.1 Refusal reasons become a closed enum.** The interpreter returns a reason *code* from a fixed
list, and the Russian copy for each code lives in our source. This removes model-generated text
from the child's screen entirely, keeps the monster's voice consistent, and avoids an output
moderation pass on every refusal. It also collapses the interchangeable `underspecified` and
`irrelevant` statuses into one `unclear`, per the receipt.

**This change is unmeasured.** The spike measured free-text reasons. First task of this phase is to
re-run the fixture suite with the enum contract and confirm literalness holds. If constraining the
reason to an enum degrades it, the enum shrinks or the codes get examples — the measurement decides,
not the plan.

**4.2 Fixture suite becomes a CI gate.** `npm run test:interpreter`, promoted from
`spikes/curriculum-engine/fixtures/`. Hard conditions: **zero repairs**, literalness at or above
95%, zero schema errors. More repeats than the spike's two, since two repeats cannot characterise a
tail. This gate is the reason the course cannot silently rot when a prompt is edited or a model
version moves under us.

**4.3 Confirm on Azure.** The receipt's argument for `gpt-4o` is conservative inference, not
measurement, because no Azure credentials were available locally. Run the suite with Azure
variables set before Week 1 content is authored.

**Done when** the gate runs in CI, an empty or malformed program makes the monster say it did not
understand, and no path exists from model output to the child's screen.

## 5. Phase 3 — session runtime, progression, mastery

**Build:** the six-step session arc as data rather than control flow; per-attempt records;
`ConceptMastery` wired into the student path, where it currently exists in the schema but is unused;
Leitner-style review scheduling for the opening step of each session.

**Delete, do not patch, `checkChallengeSuccess`.** Progression is gated on the deterministic checker
alone. A model may colour the monster's commentary; it may never decide whether a child advances.

**Migration:** a task-attempt table on Turso. Stores concept, tier, attempt count and outcome.
Never the child's words (`COPPA-CONSENT-SPEC.md:84`).

**Gate:** scheduler and mastery are pure functions with unit tests. Existing anti-double-reward
behaviour keeps its regression guard (`QA-2026-07-18.md:56-74`).

**Done when** a child can complete one session end to end, mastery moves, and a replay awards
nothing.

## 6. Phase 4 — difficulty calibration

Not a formula. Two formulas were tried in the spike and both passed an offline test while being
wrong; only the closed loop caught them.

**Build:** the synthetic-child harness ships as `npm run calibrate:tasks`. It plays each tier and
reports mean attempts.

**Gate:** mean attempts must rise monotonically across tiers. Content that fails calibration is
rejected, and tier boundaries are set from the measurement.

**Known input to the calibration:** difficulty tracks whether a shape forces an explicit offset
("начиная со второй", "пропусти одну") rather than admitting a relational description ("посередине",
"над ними"). Use that to author candidates; use the harness to decide.

## 7. Phase 5 — Week 1 content

Three sessions, **8 to 12 tasks each**. The spec's three-or-four-task session cannot fill fifteen
minutes at the observed one to two attempts per task.

**Build:** `src/content/curriculum/week-1/session-{1,2,3}.ts`; `curriculum.ts` demoted to loader and
validator. Build-time content validation: every session declares its concept, its misconception,
its transfer task, and a deterministic check for every task.

**Done when** the validator rejects an incomplete session at build time and Week 1 passes
calibration.

## 8. Phase 6 — parent-facing weekly report

Per-concept mastery, the skill the child struggled with, and one question to ask at dinner.

**Blocked on an existing debt:** the Resend domain is unverified, so weekly email cannot send
(`HANDOVER-2026-07-18.md:115-116`). Build the content, ship it behind the same flag, and do not let
this block Week 1.

## 9. Phase 7 — Weeks 2 to 5

One week per week, each passing the content validator and calibration. Weeks 3 to 5 need three more
task families (`rule-runner`, `pattern-expand`, `claim-check`), which reuse the Phase 1 shape but
are **unproven** — only two families were simulated. Budget one calibration round per family.

## 10. Schedule, honestly

The stated wish is one to two weeks for the first delivery. Phases 1 through 5 are roughly eleven to
sixteen working days. Two to three weeks is the honest estimate for engine plus Week 1.

What fits in about a week and a half, if that matters more than completeness:

- Phases 1 and 2 in full, including the CI gate. Skipping this is not an option; it is the thing
  that keeps the course honest.
- Phase 3 reduced to a single session type with mastery recorded but not yet adapting.
- Week 1 with the two proven families only.
- Phases 4 and 6 deferred, with tiers hand-set and flagged as uncalibrated.

The alternative to cutting scope is telling the ten families that the first session lands in three
weeks instead of two, which the design's staged delivery already anticipates.

## 11. Test and CI additions

Extending `verify:release`, never replacing:

| Command | What it guards |
|---|---|
| `npm run test:tasks` | executors, checkers, diffs, determinism, no blame language |
| `npm run test:interpreter` | literalness fixtures, zero repairs, schema validity |
| `npm run calibrate:tasks` | difficulty ladder is real, run per content change |
| content validator in `npm run build` | no session ships without concept, misconception, transfer task, deterministic check |
| existing suites | unchanged |

## 12. What would make me stop and rethink

- The enum-constrained interpreter loses literalness and cannot be recovered with examples.
- Azure `gpt-4o` measures materially worse than `gemini-2.5-flash` on the fixtures.
- Real children's spelling and phrasing defeat the interpreter where the synthetic child did not.
  The design's pre-decided retreat applies: constrained block-based input for the youngest tier.
  The measurement says it is not needed today; only real children can confirm that.
