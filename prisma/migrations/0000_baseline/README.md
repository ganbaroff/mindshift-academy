# 0000_baseline — historical schema snapshot ONLY

**Generated:** 2026-07-31 via  
`npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`

**Authority:** `docs/handoffs/CURSOR-MINDSHIFT-V1-IMPLEMENTATION.md` §W0 + §3A.1.

## Non-application rule (MANDATORY)

`migration.sql` is an **immutable historical snapshot** of the Prisma schema as CREATE TABLE DDL from empty.

It **MUST NEVER** be applied against a non-empty database (local, staging, or production Turso).

Reasons:
- From-empty CREATE is not a migration; it is a dump of desired empty-state shape.
- Applying it to a live DB risks destructive recreate semantics, silent IF NOT EXISTS no-ops that hide drift, or false confidence that “migrations are applied.”
- Rollback is **restore from backup / reverse additive delta**, never “re-run baseline from empty.”

Proof of non-application for this wave: W0 commits the file and README only. No `turso-db-push`, no `prisma migrate deploy`, no production or shared Turso touch. Local rollback drill uses a **file copy** and restore-from-copy — see `docs/release/W0-ROLLBACK-DRILL-2026-07-31.md`.

## How schema changes reach Turso (pilot rule)

1. **Read-only receipt** of the LIVE Turso schema (table/column list) before any change. Prod table presence was UNKNOWN at handoff — verify before any deploy (CEO gate).
2. Generate an **additive / idempotent delta** from that live schema → target schema (never from-empty for live DBs).
3. **Rehearse** the delta on an isolated production-like copy.
4. Validate **rollback / forward-repair** on that isolated copy (restore from snapshot file, or reverse ALTER). Document the transcript.
5. Apply to production **only** after direct CEO approval (red gate 10).

Helper for **empty / greenfield** Turso only (not for non-empty pilot DBs):

```text
node scripts/turso-db-push.mjs path/to/additive-or-greenfield.sql
```

`turso-db-push.mjs` rewrites CREATE → `IF NOT EXISTS` and applies via `@libsql/client`. It still must not be used as a substitute for a verified live-schema delta on a non-empty pilot database.

## Additive-only pilot rule

During the controlled pilot:
- Prefer `ALTER TABLE ... ADD COLUMN` / new tables with `IF NOT EXISTS`.
- No DROP TABLE / DROP COLUMN on pilot data without a separate CEO-approved destructive plan.
- Baseline `0000_baseline` stays frozen history; new waves add numbered additive migrations after a live-schema receipt.
