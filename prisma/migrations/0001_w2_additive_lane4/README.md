# 0001_w2_additive_lane4 — ADDITIVE ONLY

**Authority:** handoff W2 + §3A.1 + §3A.2.

Adds:
- `TaskAttempt.sessionId` / `taskId` (nullable) for resume derivation from attempts
- `DegradeEvent` (pseudonymous session-scoped degrade observability)
- `ReportDeliveryLog` (clerkId, ok, errorClass)
- `SessionCost` (tokens/cost only)

## Rules

- Safe shape for non-empty DBs: `ALTER TABLE … ADD COLUMN` + `CREATE TABLE IF NOT EXISTS`.
- **Do not apply to production** without CEO approval and a live Turso schema receipt.
- Local proof: `docs/release/_w2_drill_workspace/run-additive-drill.mjs` (isolated file DB).
- Rollback for local drill = restore from `pre.db` file copy — never re-run `0000_baseline`.
