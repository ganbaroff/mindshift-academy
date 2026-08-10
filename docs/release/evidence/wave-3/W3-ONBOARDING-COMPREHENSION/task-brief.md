# Task brief — W3-ONBOARDING-COMPREHENSION

## Goal

Make the three onboarding phases understandable before a child enters the first
thinking session: a named step, one visible next action, and a non-answer-revealing
example of the result of a precise command.

## Base and scope

- Base SHA: `64159c0`
- Allowed files: `src/app/onboarding/page.tsx`,
  `tests/onboarding-comprehension.test.mjs`, `package.json`,
  `scripts/qa/academy-gates.mjs`, `tests/academy-gates.test.mjs`, and this brief.
- Do not change routes, consent/security, persistence, task scoring, production
  configuration, provider settings, or legacy lesson behavior.
- Timebox: 20 minutes. No deploy, push, production operation, secret access, or
  external provider call.

## Acceptance criteria

1. Hatching, naming, and ready phases have a clear accessible heading and visible
   step status.
2. Progress updates are announced politely and do not depend on animation.
3. The primary visible action in each phase tells the child what to do next.
4. The ready phase includes "Что сделаешь" and "Что получится" with a general
   precise-command example that does not reveal the first-session solution.
5. The successful route remains `/session/w1-s1`.
6. The contract runs through `test:onboarding-comprehension` and the Academy
   offline gate.

## RED / GREEN

- RED: `node tests/onboarding-comprehension.test.mjs` fails because the headings,
  live status, explicit primary CTA, and worked example are absent.
- GREEN: `npm run test:onboarding-comprehension`, `npm run test:task-surfaces`,
  `npm run test:w2`, `npm run test:gate-contract`, lint, and build pass.

## Stop condition

Stop and return `NEEDS_CONTEXT` if the change requires new learner data,
server/API behavior, a route change, or a decision about task-answer policy.

## Receipt

`docs/release/evidence/wave-3/W3-ONBOARDING-COMPREHENSION/agent-receipt.json`
