# Task brief — W1-CROSS-BROWSER-SMOKE

## Goal

Add a bounded, read-only cross-browser current-`/session` smoke to the Academy
browser gate. Chromium's full 15-session flow already exists; this ticket proves
entry, resume after reload, and capstone completion in Firefox and WebKit without
direct attempt API calls or answer-bearing choice helpers.

## Base and scope

- Base SHA: `698476c292060f4974ee0618539d695f76ecaa83`
- Allowed files: `tests/e2e/current-session-ui.mjs`,
  `scripts/e2e/current-session-flow.mjs`, `package.json`, this brief.
- The contract test `tests/cross-browser-smoke-contract.test.mjs` may be added.
- Do not change curriculum, server routes, production configuration, secrets, or
  existing Chromium interaction semantics.
- No deploy, push, invitation, external account, or provider call.
- Timebox: 20 minutes; stop and return a receipt if browser binaries are missing.

## Acceptance criteria

1. The browser gate keeps the existing Chromium 15/15 full UI flow.
2. Firefox and WebKit each run a current-`/session` smoke covering entry, reload
   resume of the same visible task, and the capstone formulation/closure.
3. The smoke uses visible controls only; test source contains no direct
   `/api/tasks/attempt`, `passingChoiceId`, or `programForChoice` completion path.
4. Missing browser binaries produce `BLOCKED` with no false `PASS`.
5. Evidence records browser names and the three smoke milestones without child
   text, identity, secrets, or production operations.

## RED / GREEN

- RED: the current runner reports only `browser: "chromium"` and has no Firefox /
  WebKit smoke; the contract test must fail before implementation.
- GREEN: targeted runner contract and lint pass; the browser gate returns PASS only
  when Chromium plus both cross-browser smokes pass, or BLOCKED when a binary is
  unavailable.

## Receipt

Coordinator writes `agent-receipt.json` after independent review and SOL
verification under this ticket folder.
