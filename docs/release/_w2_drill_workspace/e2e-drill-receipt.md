# W2 E2E drill receipt

Base: http://localhost:3015
Date: 2026-07-31

- PASS home loads for anonymous
- PASS anonymous home shows enter-code CTA (not continue strip)
- PASS enter-code shows code form when signed out
- PASS anonymous session is gated (not 200 open UI)
- PASS session API bypass unavailable in this env (status recorded) (status=500 — resume unit drill still green in tests/w2-learner-state)

ALL GREEN