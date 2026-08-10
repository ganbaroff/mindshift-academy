# Session Task Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Academy task family understandable and completable through visible, accessible, provider-independent controls.

**Architecture:** Add a closed structured-program request path to the existing deterministic checker and small family-specific React workspaces. Keep answer keys server-only and make free worked examples use unrelated data.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Zod 4, Tailwind 4, Playwright 1.61.

## Global Constraints

- One primary CTA per task state; every target is at least 44px.
- Current `/session` only; legacy `/lesson` is never evidence.
- No child text, target, answer key, or secret in browser evidence.
- All async feedback uses `aria-live="polite"`; all motion respects reduced motion.
- Production test bypass remains impossible.

---

### Task 3A: Structured attempt and public payload contracts

**Files:**
- Modify: `src/lib/tasks/schemas.ts`
- Modify: `src/app/api/tasks/attempt/route.ts`
- Modify: `src/content/curriculum/types.ts`
- Test: `tests/task-program-contract.test.mjs`

**Interfaces:**
- Consumes: existing family program schemas and deterministic `resolveProgram`.
- Produces: `AttemptRequest.program` and answer-stripped `PublicContentTask`.

- [ ] Write RED assertions that each family program parses, a mismatched program is rejected,
  and public pattern/map answer keys are absent.
- [ ] Run `npx tsx tests/task-program-contract.test.mjs`; expect named failures.
- [ ] Add `program` as a closed optional union and require exactly one learner input mode.
- [ ] Validate the program with the resolved server family and call `finalizeAttempt` with
  `model: "structured-ui"` and zero provider tokens.
- [ ] Strip `patternExpected` and `ruleMaps[].successWhen` in `toPublicSession`.
- [ ] Run the contract test, `npm run test:attempt-trust`, lint, and build; expect exit 0.
- [ ] Commit `feat(curriculum): Add structured task attempts`.

### Task 3B: Family workspaces and free examples

**Files:**
- Create: `src/components/curriculum/task-surfaces/TaskWorkspace.tsx`
- Create: `src/components/curriculum/task-surfaces/WorkedExample.tsx`
- Create: `src/components/curriculum/task-surfaces/GridDrawSurface.tsx`
- Create: `src/components/curriculum/task-surfaces/SequenceSurface.tsx`
- Create: `src/components/curriculum/task-surfaces/RuleSurface.tsx`
- Create: `src/components/curriculum/task-surfaces/PatternSurface.tsx`
- Create: `src/components/curriculum/task-surfaces/ClaimSurface.tsx`
- Create: `src/components/curriculum/task-surfaces/examples.ts`
- Test: `tests/session-task-surfaces.test.mjs`

**Interfaces:**
- Consumes: `PublicContentTask`, `offeredTier`, and `onSubmit(program)`.
- Produces: `TaskWorkspace` with one `Проверить` action and semantic family controls.

- [ ] Write a render RED for all five families: named workspace, current data, unrelated
  worked example, labelled controls, and one enabled primary submit when complete.
- [ ] Run `npx tsx tests/session-task-surfaces.test.mjs`; expect missing component failure.
- [ ] Implement one state-local component per family; no component reads an answer key.
- [ ] Add keyboard-visible, 44px controls and deterministic reset/remove actions.
- [ ] Run render tests, lint, and build; expect exit 0.
- [ ] Commit `feat(curriculum): Add visible task workspaces`.

### Task 3C: Session integration and browser proof

**Files:**
- Modify: `src/app/session/[id]/page.tsx`
- Create: `tests/e2e/current-session-ui.mjs`
- Modify: `scripts/e2e/current-session-flow.mjs`
- Test: `tests/session-task-surfaces.test.mjs`

**Interfaces:**
- Consumes: `TaskWorkspace` programs and session route `offeredTier`.
- Produces: real `/session` learner submission plus screenshots/traces under ignored evidence.

- [ ] Write RED source/browser assertions that the page renders `TaskWorkspace`, stores
  `offeredTier`, sends `program`, and exposes feedback via `role=status`.
- [ ] Replace the family-blind primary form with `TaskWorkspace`; keep free text under a
  secondary disclosure and retain one visible primary CTA.
- [ ] Use Playwright context header `x-test-bypass: true` with `/session/<id>?demo=1`; assert
  the seam fails outside development.
- [ ] Drive at least one task of every family through visible controls with no direct attempt
  request from test code; capture 320px and desktop screenshots.
- [ ] Run `npm run verify:academy:browser`; expect PASS only when the real suite exists and
  all UI actions complete.
- [ ] Run `npm run verify:academy:offline`, request independent review, and commit after SOL verification.

