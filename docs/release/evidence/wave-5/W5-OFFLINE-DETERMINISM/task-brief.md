# Task brief — W5-OFFLINE-DETERMINISM

## Goal

Ensure deterministic offline tests never rewrite tracked historical W4 receipts.

## Acceptance criteria

1. W4 appendix and session-matrix receipt writes require
   `ACADEMY_WRITE_LEGACY_RECEIPTS=1`.
2. Default test behavior preserves all assertions/output without writing files.
3. The guard runs in the Academy offline gate.

## RED / GREEN

- RED: `node tests/w4-legacy-receipt-write-guard.test.mjs` fails because writes
  are unguarded.
- GREEN: guard, W4 suite, gate contract, lint, and build pass.

## Receipt

`docs/release/evidence/wave-5/W5-OFFLINE-DETERMINISM/agent-receipt.json`
