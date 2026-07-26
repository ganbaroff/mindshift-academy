# Gemini safety fallback design

## Scope

Restore usable child chat while preserving fail-closed safety when NVIDIA NIM's
`meta/llama-guard-4-12b` is unavailable. This is a release-blocking provider
availability fix; it does not change consent, authentication, or tutor routing.

## Evidence

On 2026-07-24 a direct fixed-text probe timed out against NVIDIA after about
20 seconds. The same Gemini request returned valid JSON in about 1.5 seconds.
Consequently, `/api/chat` fail-closed safe prompts, while Gemini still blocked
the AZ-insult regression prompt.

## Decision

Keep NVIDIA Llama Guard as the preferred primary classifier. When it errors,
run a separate primary safety classifier prompt on the already configured
Gemini client. The existing kidNet prompt remains the second classifier.
Allow a message only when both active classifier verdicts are safe. Any error,
malformed response, or unsafe verdict blocks the message.

This is preferred over increasing NVIDIA timeouts (the provider did not answer)
and over accepting a single classifier (would weaken the child-safety boundary).

## Interface and flow

`moderate()` receives an optional NVIDIA guard client and the required chat
client. It first runs the NVIDIA Llama Guard and kidNet concurrently. If the
NVIDIA verdict errors, it replaces only that failed verdict with Gemini's
primary-safety JSON classifier. The fallback uses a different, harm-taxonomy
prompt from kidNet. It returns a safe result only after both Gemini classifiers
reply with valid safe JSON.

## Failure behavior

- NVIDIA available and answers: existing two-provider logic is unchanged.
- NVIDIA error and both Gemini checks are safe: allow the request.
- NVIDIA error plus a Gemini error, malformed JSON, or unsafe verdict: block.
- NVIDIA gives unsafe: block without a fallback override.

## Verification

Add deterministic tests for a missing/failed NVIDIA guard with a safe Gemini
fallback and for a fallback unsafe verdict. Run the live lane so safe prompts
pass, unsafe/AZ prompts block, and its per-request timeout remains intact.

No commit is made: the release instruction explicitly preserves the dirty
worktree and forbids commits/pushes.
