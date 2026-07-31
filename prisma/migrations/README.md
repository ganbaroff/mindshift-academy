# prisma/migrations

Pilot rule: additive-only deltas after a live Turso schema receipt.
`0000_baseline/` is historical-from-empty ONLY — never apply to non-empty DBs.
See `0000_baseline/README.md` and `docs/handoffs/CURSOR-MINDSHIFT-V1-IMPLEMENTATION.md` §3A.1.
