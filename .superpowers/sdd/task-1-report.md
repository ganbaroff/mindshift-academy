# Task 1 — Supply-chain и Vercel packaging

## Status

DONE

## Changed files

- Created `.vercelignore` with the exact source-bundle exclusions required for environment files, Clerk local state, and SQLite databases; `.env.example` remains included.
- Created `tests/release-packaging.test.mjs` to enforce the ignore-file and dependency/override contract.
- Updated `package.json` to pin Next and `eslint-config-next` to `16.2.11`, Prisma packages to `7.9.0`, retain `next.postcss=8.5.19`, remove the obsolete `@prisma/dev.@hono/node-server` override, and add `sharp=0.35.3` and `fast-uri=3.1.4` overrides.
- Regenerated `package-lock.json` with npm.

## TDD evidence

### RED

`node tests/release-packaging.test.mjs` exited with code 1 before configuration was added. It failed at `readFileSync` with `ENOENT` for the missing `.vercelignore`.

### GREEN

After the configuration and version updates, `node tests/release-packaging.test.mjs` exited with code 0 and printed `Release packaging contract passed`.

## Verification

- `node tests/release-packaging.test.mjs`: PASS (exit 0).
- `npm audit --omit=dev --audit-level=high`: PASS — `found 0 vulnerabilities`.
- `npm run build`: PASS (exit 0) with Prisma Client `7.9.0` and Next.js `16.2.11`; compilation, TypeScript checking, page-data collection, and static generation all completed.
- `git diff --check -- .vercelignore package.json package-lock.json tests/release-packaging.test.mjs`: PASS.
- Self-review covered only Task 1 files. The lockfile changes are npm-generated and include the expected Next, Prisma, Sharp, and Fast URI dependency resolution updates.

## Concerns

None for the required production release gate. A non-production full-install npm audit reported two high-severity findings, but the required production-only audit with dev dependencies omitted reports zero vulnerabilities.
