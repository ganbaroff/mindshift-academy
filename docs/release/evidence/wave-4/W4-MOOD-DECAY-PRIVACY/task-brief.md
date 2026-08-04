# Task brief — W4-MOOD-DECAY-PRIVACY

## Goal

Remove child and identity-bearing text from mood-decay cron logs while retaining
safe aggregate diagnostics and the existing auth, decay, and response behavior.

## Base and scope

- Base SHA: `07ec6f8`
- Allowed files: `src/app/api/cron/mood-decay/route.ts`, focused privacy test,
  `package.json`, Academy gate contract files, and this ticket evidence.
- No schema, route contract, cron auth, decay rules, provider configuration,
  production operation, secret access, deploy, or push.

## Acceptance criteria

1. No mood-decay log interpolates `user.username` or `user.monster.name`.
2. Parent-warning diagnostics contain aggregate-safe counts only.
3. Catch diagnostics contain error type/name only, never the raw error object.
4. The focused contract is in the deterministic Academy offline gate.

## RED / GREEN

- RED: `node tests/mood-decay-privacy.test.mjs` fails on identity and raw-error
  logging.
- GREEN: focused test, gate contract, lint, and build pass.

## Receipt

`docs/release/evidence/wave-4/W4-MOOD-DECAY-PRIVACY/agent-receipt.json`
