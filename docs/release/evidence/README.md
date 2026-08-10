# Academy release evidence

Only reviewed frozen-candidate receipts belong here. Routine runs write to the ignored
`.superpowers/sdd/evidence/` directory.

Publish a frozen receipt with an explicit destination, for example:

```powershell
$env:ACADEMY_GATE_EVIDENCE_DIR='docs/release/evidence/wave-5/offline'
npm run verify:academy:offline
```

Before committing a receipt, verify that it contains the intended Git SHA, no skipped
command, no secret or child data, and a valid `PASS | FAIL | BLOCKED | UNVERIFIED`
verdict. Agent prose cannot upgrade a receipt.
