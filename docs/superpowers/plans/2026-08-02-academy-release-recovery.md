# Academy Release Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `subagent-driven-development` task-by-task. Every production-code change uses
> `test-driven-development`; every failure uses `systematic-debugging`.

**Goal:** Close the verified educational P0/P1 defects and produce a frozen,
reproducible Academy release candidate.

**Architecture:** Preserve the deterministic task engine, add family-specific visible
interaction surfaces, and separate deterministic, browser, live-provider, and
production gates. SOL integrates reviewed atomic tickets and alone owns release status.

**Tech Stack:** Next.js 16.2 local documentation, React 19, TypeScript, Playwright,
Clerk, Prisma/libSQL/Turso.

## Global Constraints

- Never Red: feedback is specific and shame-free.
- Child-facing transitions are at most 800ms and respect reduced motion.
- One primary CTA per learning state; child targets are at least 44px without overflow.
- No raw child text, identity, secrets, or permanent child identifiers in evidence.
- No live provider in ordinary unit, integration, CI, or offline gates.
- No legacy `/lesson` browser result may certify the current `/session` curriculum.
- No P0/P1 waiver for learning, safety, accessibility, privacy, auth, or persistence.

---

### Task 1: Release-control plane

**Produces:** protocol, ledger, receipt contracts, gate manifest and four separate gate
commands.

- [ ] Write the gate-contract test and confirm missing implementation is RED.
- [ ] Implement the manifest, runner, production smoke and package scripts.
- [ ] Run `npm run test:gate-contract` and verify GREEN.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Request task review and commit after SOL verification.

### Task 2: Learning-integrity regressions

**Produces:** tests that reject full-output pattern cycles, answer-bearing fallback, and
capstone completion without collision/prediction.

- [ ] Add one failing test for each verified bypass and record expected RED output.
- [ ] Add the minimum domain metadata needed to express generator and capstone policy.
- [ ] Replace canonical-answer fallback with constrained learner interaction.
- [ ] Run `npm run test:tasks`, `npm run test:session`, and `npm run test:w4`.
- [ ] Request task review and commit after SOL verification.

### Task 3: Visible task-family surfaces and worked examples

**Produces:** semantic sequence, rule, pattern and claim surfaces plus a free example for
the first encounter with every mechanic.

- [ ] Add failing render/interaction tests for each family.
- [ ] Implement small family components with explicit accessible names and outcomes.
- [ ] Connect actual `offeredTier` and non-answer-revealing help.
- [ ] Verify 320/375/768px, desktop, keyboard, reduced motion and 200% zoom.
- [ ] Request task review and commit after SOL verification.

### Task 4: Current-session browser proof

**Produces:** Playwright flow that drives the visible `/session` controls and proves
save/resume without direct canonical attempt submission.

- [ ] Build deterministic authenticated fixtures without enabling production bypass.
- [ ] Drive all 15 sessions in Chromium through current learner controls.
- [ ] Drive entry, resume and capstone in Firefox and WebKit.
- [ ] Save screenshots/traces for failure and frozen-candidate evidence.
- [ ] Run `npm run verify:academy:browser` and request review.

### Task 5: Auth, persistence, consent and privacy

**Produces:** browser proof for reload/relogin/two-child isolation/revoke/delete and
privacy-safe operational logs.

- [ ] Write failing tests for every persistence and consent transition.
- [ ] Remove identity-bearing mood-decay logging.
- [ ] Verify `test:attempt-trust`, `test:dual-children`, consent and lifecycle suites.
- [ ] Run the real test-account journey against the approved non-production target.
- [ ] Request review and commit after SOL verification.

### Task 6: Frozen release candidate

**Produces:** one frozen SHA with published offline/browser/a11y/pedagogy/release
receipts and an evidence-backed `GO/NO-GO`.

- [ ] Run `verify:academy:offline` and `verify:academy:browser` from a clean checkout.
- [ ] Run pedagogy, child-UX, and release audits; classify findings as
  `ACCEPT`, `REJECT`, or `UNVERIFIED`.
- [ ] Fix all P0/P1 and rerun the entire gate on the new SHA.
- [ ] Run bounded synthetic live smoke only with explicit approval and cost ceiling.
- [ ] Deploy through SOL, verify production identity, run post-deploy smoke, and retain
  rollback evidence before invitations.
