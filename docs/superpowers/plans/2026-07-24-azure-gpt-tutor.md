# Azure GPT Tutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the child-facing tutor and lesson judge through Azure GPT while preserving independent fail-closed moderation and informed parental consent.

**Architecture:** Add a narrowly scoped Azure client factory in `src/lib/ai-provider.ts`. The existing chat factory returns Azure GPT only after validating the five Azure settings; Gemini remains the existing fallback. Keep `moderate()` and the NVIDIA/Gemini safety topology unchanged. Bump consent version and provider copy together.

**Tech Stack:** Next.js 16, TypeScript, OpenAI Node SDK `AzureOpenAI`, Clerk, Turso, Gemini, NVIDIA, Node deterministic tests.

## Global Constraints

- Never log, commit, or return any API-key value.
- Azure GPT is tutor/judge only; input and output moderation remain mandatory and fail closed.
- Preserve 120-token judge and 150-token tutor limits and zero SDK retries.
- No commit or push in this release workspace.

---

### Task 1: Azure provider contract

**Files:**
- Modify: `src/lib/ai-provider.ts`
- Modify: `tests/deterministic.mjs`

**Interfaces:**
- Produces `getChatClient(): { client: OpenAI; model: string } | null`, returning Azure GPT when Azure configuration is complete.

- [ ] Write deterministic source/behaviour assertions for Azure config precedence, primary-key selection, secondary-key fallback, and Gemini fallback.
- [ ] Run `npm test`; expect Azure assertions to fail before implementation.
- [ ] Add an `AzureOpenAI` client factory with endpoint, deployment and API-version validation; construct it with `timeout: 12000` and `maxRetries: 0`.
- [ ] Run `npm test`; expect all deterministic checks to pass.

### Task 2: Consent disclosure version

**Files:**
- Modify: `src/lib/consent-policy.ts`
- Modify: `src/app/consent/page.tsx`
- Modify: `src/app/activate/page.tsx`
- Modify: `tests/deterministic.mjs`

**Interfaces:**
- Produces a new current consent version naming Microsoft Azure OpenAI as the tutor/judge processor.

- [ ] Write assertions that current consent copy names Microsoft Azure OpenAI and that the previous version is stale.
- [ ] Run `npm test`; expect the new disclosure assertion to fail.
- [ ] Bump the consent version and update both parent-consent surfaces with consistent Russian provider disclosure.
- [ ] Run `npm test` and `npm run test:consent`; expect green results.

### Task 3: Credential migration and release proof

**Files:**
- Modify: `.env.example`
- Modify: `src/lib/production-env.ts`
- Modify: `tests/production-env-contract.test.mjs`
- Modify: `docs/RELEASE-STATUS-2026-07-24.md`

**Interfaces:**
- Production contract requires non-placeholder Azure endpoint, deployment, API version and at least one key.

- [ ] Write contract tests for incomplete Azure config and valid rotated-key config.
- [ ] Run `npm run test:config`; expect the Azure contract test to fail.
- [ ] Add the non-secret environment names to examples and production contract; copy values directly from the authorised source environment to Vercel without printing them.
- [ ] Run `npm run verify:release`, deploy production and execute an authenticated-free canary plus provider diagnostics that never send child data.
