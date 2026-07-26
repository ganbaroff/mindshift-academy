## Status

Completed inline after two implementer-agent turns stalled before the implementation step.

## TDD evidence

- RED: `npm test` failed with `safe text passes when the unavailable NVIDIA guard is replaced by two valid Gemini checks (safe=false source=fail-closed)`.
- GREEN: `npm test` passed with `47 passed, 0 failed` after the minimal fallback implementation.
- Static verification: `npm run lint` exited 0 with no output.

## Implemented

- `moderate()` now accepts an optional NVIDIA guard client, uses NVIDIA when it returns a verdict, and invokes a distinct Gemini primary safety classifier only when NVIDIA errors or is unavailable.
- kidNet and the Gemini primary classifier reject malformed JSON instead of accepting an omitted `unsafe` boolean.
- The chat route passes the nullable NVIDIA client rather than substituting Gemini into the NVIDIA-only Llama Guard slot.

## Files changed for this task

- `src/lib/moderation.ts`
- `src/app/api/chat/route.ts`
- `tests/deterministic.mjs`
