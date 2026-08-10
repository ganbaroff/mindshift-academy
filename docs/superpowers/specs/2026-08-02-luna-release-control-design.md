# LUNA release-control design

**Status:** approved for implementation on 2026-08-02
**Product boundary:** MindShift Academy learning programme only
**Release owner:** SOL

## Objective

Academy release claims must be reproducible from a frozen Git SHA, an exact command,
an exit code, and browser evidence where the claim concerns learner behaviour. Agent
prose is context, never completion evidence.

## Roles and authority

- SOL owns architecture, integration, production actions, and `GO/NO-GO`.
- A LUNA coordinator may dispatch one implementer or up to two independent read-only
  auditors. A child agent may not dispatch another agent.
- An implementer owns one ticket for at most 20 minutes in an isolated worktree.
- A fresh reviewer checks both specification compliance and code quality.
- LUNA may not deploy, push a protected branch, mutate production data or environment,
  send invitations, inspect secrets, or declare the release complete.

## Ticket state machine and watchdog

Normal states are `QUEUED → BOOTED → RED → GREEN → SELF_REVIEW → REVIEW →
SOL_VERIFY → COMPLETE`. Exceptional states are `NEEDS_CONTEXT`, `POLICY_BLOCK`,
`TEST_FAILURE`, `TIMEBOX_EXPIRED`, `STALE_BASE`, and `UNKNOWN`.

- Wait for agent events in windows no longer than 60 seconds; silence is `UNKNOWN`.
- Ask for one checkpoint at 15 minutes and interrupt at 20 minutes.
- Retry the same transient failure at most twice. A policy block is never rerouted.
- Three failed debugging hypotheses stop implementation and trigger architecture review.
- A changed base SHA or overlapping file ownership stops integration.
- Resume after compaction from `.superpowers/sdd/progress.md` and `git log`.

## Gates

`G0` baseline, `G1` ticket-ready, `G2` verified RED/GREEN, `G3` independent review,
`G4` SOL verification, `G5` wave integration, `G6` child UX/accessibility, `G7`
learning integrity, `G8` frozen release candidate, and `G9` production identity/smoke.

Every result is `PASS`, `FAIL`, `BLOCKED`, or `UNVERIFIED`. Missing or skipped
evidence is never `PASS`. Any P0 or P1 blocks release. P2 may remain only with an
explicit risk receipt and never when it affects learning, child safety, accessibility,
privacy, authentication, or persistence.

## Evidence flow

Routine gate output is written under ignored `.superpowers/sdd/evidence/`. A frozen
candidate reruns the same gate with `ACADEMY_GATE_EVIDENCE_DIR` set to a ticket folder
under `docs/release/evidence/`, reviews the receipt, and commits it with the frozen SHA.

The release lanes are intentionally separate:

- `offline`: deterministic checks, no browser and no live provider;
- `browser`: current `/session` UI only, never legacy `/lesson` evidence;
- `live`: explicit synthetic provider smoke with a cost ceiling;
- `prod`: explicit read-only HTTPS production probes, never deployment.

## Binding product decisions

- The capstone requires collision and prediction evidence in addition to practice and
  transfer.
- A degradation fallback may not derive a canonical passing answer from task targets.
- Pattern authorship must distinguish a compact generator from copying the complete
  expected output.
- All assessed information must be visible and have an accessible semantic equivalent.
- The pilot course is Russian-language; AZ/EN surfaces must not promise a translated
  course until that course exists and is reviewed.
