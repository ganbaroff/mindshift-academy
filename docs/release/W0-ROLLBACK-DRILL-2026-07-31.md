# W0 Rollback / Restore Drill — 2026-07-31

**Wave:** W0 only (`docs/handoffs/CURSOR-MINDSHIFT-V1-IMPLEMENTATION.md`).  
**Authority:** Section 3A.1 — rollback ≠ re-run from-empty baseline.  
**Environment:** isolated local `file:` libsql DBs under `docs/release/_w0_drill_workspace/`.  
**NOT touched:** Turso production, Railway, Vercel, secrets, `.env` values (never printed).

## Baseline snapshot path

`prisma/migrations/0000_baseline/migration.sql`  
(+ `prisma/migrations/0000_baseline/README.md`)

Generated:

```text
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

12 tables: AccessCode, AtlasLearningSession, ConceptMastery, ConsentVerification, Inventory, Lesson, LessonProgress, Monster, ParentalConsent, RewardEvent, TaskAttempt, User.

## Explicit non-application proof

1. Header banner in `migration.sql`: **DO NOT APPLY TO A NON-EMPTY DATABASE**.
2. README forbids application to non-empty local/staging/prod.
3. Drill step **B2** refuses to re-run baseline against non-empty `work.db` after seed (tables=12, users=1).
4. This wave did **not** invoke `scripts/turso-db-push.mjs`, did **not** call Turso, did **not** deploy.

## Drill procedure (executed)

Runner: `docs/release/_w0_drill_workspace/run-drill.mjs`  
Console log: `docs/release/_w0_drill_workspace/drill-console.log`

| Step | Action | Result |
|---|---|---|
| A1 | Open empty `work.db` | tables `[]` |
| A2 | Apply baseline **only because empty** | 12 tables created |
| A3 | Seed User + AccessCode | User=1, AccessCode=1 |
| A4 | `copyFileSync(work.db → pre.db)` | snapshot 172032 bytes |
| B1–B2 | Confirm non-empty; **refuse** baseline re-apply | NON-APPLICATION recorded |
| B3 | Intentional damage (replace user with xp=999 decoy) | User=`user-drill-DAMAGED` |
| C1 | Restore: `copyFileSync(pre.db → work.db)` | file-copy rollback |
| C2–C3 | Verify User=`user-drill-1`, xp=10 | **PASS** |
| C4 | Assert rollback mechanism | **file copy**, not CREATE-from-empty |

## Conclusion

**PASS.** Validated rollback/forward-repair on an isolated copy = restore from snapshot file.  
Representing `CREATE TABLE from empty` as rollback is **rejected** (Section 3A.1).

Artifact DBs (`pre.db`, `work.db`) are local-only and gitignored; transcript + runner + console log are the durable proof.
