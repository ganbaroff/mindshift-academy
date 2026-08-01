# Ticket `W1-STRUCTURED-ATTEMPT`

- Goal: add a provider-independent, server-validated structured attempt path and remove answer keys from public task payloads.
- Product context: foundation for visible family workspaces; no browser readiness claim in this ticket.
- Base SHA: `14d610b`.
- Allowed files: task request schemas, attempt route, curriculum public types/serialization, focused tests, package test command if needed.
- Forbidden actions: production operations, database/schema mutation, live AI, Clerk/Turso secrets, visual redesign.
- Consumes: existing family program schemas, resolved server curriculum task, deterministic `resolveProgram`/`finalizeAttempt`.
- Produces: `AttemptRequest.program`, family-specific validation, answer-stripped `PublicContentTask`.
- Acceptance criteria: exactly one of text/legacy choice/structured program; wrong-family or unclear programs rejected; target/family/tier remain server-owned; `patternExpected`, claim truth, and rule `successWhen` absent from public payload; structured pass persists through the normal finalizer with zero provider tokens.
- RED command and expected failure: `npx tsx tests/task-program-contract.test.mjs`; structured program rejected and public answer fields leaked.
- GREEN commands: focused contract, `npm run test:attempt-trust`, `npm run test:session`, `npm run lint`, `npm run build`.
- Stop condition: any production bypass, client answer-key field, database migration, or live provider requirement.
- Timebox: 20 minutes per bounded worker/reviewer action.
- Agent receipt path: `docs/release/evidence/wave-1/W1-STRUCTURED-ATTEMPT/agent-receipt.json`.

