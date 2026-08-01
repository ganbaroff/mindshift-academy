# TaskBrief — W1-SESSION-INTEGRATION

- **Ticket:** `W1-SESSION-INTEGRATION`
- **Goal:** make the five accepted workspaces the primary learner path on current `/session` and prove the path through a real browser without direct attempt API submission.
- **Product area:** Wave 1 current session UI and browser gate.
- **Base SHA:** `538b6790098be2d5f663de6b285d8864856e49de`
- **Timebox:** split UI integration and full browser matrix if either exceeds 20 minutes.

## Allowed files

- `src/app/session/[id]/page.tsx`
- `src/components/layout/Header.tsx`
- `src/components/curriculum/task-surfaces/TaskWorkspace.tsx`
- `tests/session-task-integration.test.mjs`
- `tests/w4-a11y-appendix.test.mjs`
- `tests/e2e/current-session-ui.mjs`
- `scripts/e2e/current-session-flow.mjs`
- `package.json`
- `scripts/qa/academy-gates.mjs`
- `docs/release/evidence/wave-1/W1-SESSION-INTEGRATION/**`
- `docs/release/W4-A11Y-APPENDIX-A-RECEIPT.md`
- `docs/release/_w4_drill_workspace/a11y-appendix-a-receipt.md`

## Forbidden actions

- No direct `/api/tasks/attempt` calls from browser test code.
- No legacy `/lesson` evidence, canonical choice fallback, production bypass, deploy, production env/data changes, secret access, or invitations.
- Do not reveal server answer keys in public payload or screenshots.

## Interfaces

- Input: `PublicSessionContent`, route `offeredTier`, `TaskWorkspace` structured programs.
- Output: visible `/session` task submission through `runAttempt({ program })`, live-region feedback, and real Playwright evidence.

## Acceptance criteria

1. The current page renders `TaskWorkspace` as the primary task interaction and stores the route's `offeredTier`.
2. Structured programs use the existing `/api/tasks/attempt` trust boundary and preserve normal feedback/progress/reward behavior.
3. Free text is available only as a clearly secondary disclosure; legacy choice mode is not used to certify completion.
4. Async task feedback has `role="status"`, `aria-live="polite"`, and `aria-atomic="true"`.
5. The grid reference appears inside the workspace before the unrelated example without allowing clicks on the answer image.
6. Browser code drives visible controls only, asserts the dev bypass is rejected under production mode, and writes screenshot/trace evidence without child data.
7. Browser gate remains `BLOCKED` unless its declared scope is fully exercised; partial evidence cannot return PASS.

## TDD commands

- **RED:** `node tests/session-task-integration.test.mjs`
  - Expected: current page has no workspace/program/offered-tier integration.
  - Expected exit code: `1`.
- **GREEN:** `node tests/session-task-integration.test.mjs`
- **Browser:** `npm run verify:academy:browser`
- **Neighbour:** `npm run test:task-surfaces && npm run test:structured-attempt`
- **Quality:** `npm run lint && npm run build`

## Stop condition

Stop and split if a real browser journey requires answer-key disclosure, direct API completion, production-like bypass, a new auth policy, or more than the timebox. External browser installation or port availability is `BLOCKED`, never PASS.

## Receipt

Write `docs/release/evidence/wave-1/W1-SESSION-INTEGRATION/agent-receipt.json` with browser artifact paths and explicit session/browser coverage.
