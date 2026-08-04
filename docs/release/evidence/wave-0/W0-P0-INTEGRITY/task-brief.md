# Ticket `W0-P0-INTEGRITY`

- Goal: make the known pattern, capstone, and answer-bearing fallback bypasses fail closed.
- Product context: Wave 0 learning-integrity recovery; this ticket does not certify task UI or browser usability.
- Base SHA: `2af0621cf14c15fda06373ffcf7fa141233a92f2`.
- Allowed files: task engine/session contracts, curriculum types/validator and `w5-s3`, attempt route, directly related deterministic tests and the historical W4 engine receipt.
- Forbidden actions: production operations, secrets, schema/database mutations, deploy, unrelated UI redesign, live AI calls.
- Consumes: authored curriculum tasks and deterministic attempt results.
- Produces: compact pattern-rule validation, explicit collision/prediction completion requirements, and a non-answer-bearing degraded path.
- Acceptance criteria: a copied full pattern output fails with `copied_output`; `w5-s3` cannot complete without separate passed collision and prediction tasks; fallback choices cannot derive any canonical passing program; resume/server completion use the same requirements.
- RED command and expected failure: `npm run test:tasks`, `npm run test:session`, and `npx tsx tests/w4-ai-safety.test.mjs`; failures must name copied output, missing capstone evidence, and all five answer-bearing fallback families.
- GREEN commands: the three RED commands, `npm run test:w2`, `npm run test:attempt-trust`, `npm run test:w4`, `npm run lint`, and `npm run build`.
- Stop condition: any need for a database migration, production credential, live provider, or broad interactive-surface implementation returns the remaining scope to Wave 1/2.
- Timebox: 20 minutes per bounded worker/reviewer action; SOL integration may span the ticket lifecycle.
- Agent receipt path: `docs/release/evidence/wave-0/W0-P0-INTEGRITY/agent-receipt.json`.
