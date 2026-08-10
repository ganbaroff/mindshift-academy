# Task brief — W5-RELEASE-PACKAGING-CONTRACT

## Goal

Make the release-packaging contract verify the package versions already committed
to the Academy repository, while retaining Vercel, proxy, and Clerk environment
boundaries.

## Base and scope

- Base SHA: `aa16fcd`
- Allowed files: `tests/release-packaging.test.mjs`, `package.json`, Academy gate
  contract files, and this ticket evidence.
- Do not change dependency versions, lockfiles, deployment configuration,
  production environment, secrets, or providers.

## Acceptance criteria

1. Assertions match committed Next `16.2.12`, eslint-config-next `16.2.9`, and
   Prisma/client `7.9.1` versions.
2. Removed override assertions are not asserted when no longer present in the
   committed package manifest.
3. Vercel ignore, proxy authorized party/origin, Clerk JS URL, sharp override,
   and Clerk localization assertions remain.
4. The contract has a package script and is included in deterministic offline gates.

## RED / GREEN

- RED: `node tests/release-packaging.test.mjs` fails on stale version `16.2.11`.
- GREEN: target, gate contract, lint, and build pass.

## Receipt

`docs/release/evidence/wave-5/W5-RELEASE-PACKAGING-CONTRACT/agent-receipt.json`
