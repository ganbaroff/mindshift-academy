# Task brief — W4-TASK-OWNERSHIP-ISOLATION

## Goal

Prevent a RewardEvent created for one child from suppressing a different child's
hint purchase, task-pass award, hint visibility, or legacy pass recovery.

## Base and scope

- Base SHA: `d090c19`
- Allowed files: `src/lib/tasks/crystals.ts`, focused ownership regression
  tests/runners, `package.json`, Academy gate contract files, and this ticket's
  evidence files.
- Do not change Prisma schema, routes, consent policy, production configuration,
  provider settings, or perform production operations.
- Timebox: 20 minutes. No deploy, push, secrets, or external provider calls.

## Acceptance criteria

1. New hint and task-pass ids are versioned and user-scoped.
2. Same-user replay stays idempotent.
3. Two users independently purchase the same hint and receive the same task-pass
   award.
4. Legacy ids are honored only when their stored `userId` matches the caller.
5. `listPassedTaskIds` reads both v2 and legacy ids, filtering both by user.
6. A throwaway SQLite integration harness runs through the Academy offline gate.

## RED / GREEN

- RED: `node scripts/run-task-ownership-isolation.mjs` fails because global
  `hint:<session>:<task>` and `taskpass:<session>:<task>` ids leak idempotency.
- GREEN: focused harness, Academy gate contract, lint, and build pass.

## Stop condition

Stop if a schema migration, legacy data rewrite, or production data operation is
needed; return `NEEDS_CONTEXT` instead of attempting it.

## Receipt

`docs/release/evidence/wave-4/W4-TASK-OWNERSHIP-ISOLATION/agent-receipt.json`
