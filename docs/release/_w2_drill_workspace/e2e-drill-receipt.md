# W2 E2E drill receipt

Base: http://localhost:3015
Date: 2026-07-31

- PASS home loads for anonymous
- PASS anonymous home shows enter-code CTA (not continue strip)
- PASS enter-code shows code form when signed out
- PASS anonymous session is gated (not 200 open UI)
- SUPERSEDED: prior check incorrectly labeled status=500 as PASS.
  Correct contract (post-housekeeping): session API must return 200 with
  payload, or clean 401/403 — never treat 500 as PASS. Re-run
  `scripts/e2e/w2-drills.mjs` after the W3 housekeeping fix for a fresh receipt.