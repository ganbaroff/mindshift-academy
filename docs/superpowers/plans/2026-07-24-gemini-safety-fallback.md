# Gemini Safety Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore usable safe child chat when NVIDIA Llama Guard is unavailable without making the safety boundary fail-open.

**Architecture:** Keep NVIDIA Llama Guard as the preferred primary classifier. If it returns an error, replace only that missing verdict with a Gemini primary-safety JSON classifier; retain kidNet as a separate Gemini prompt. A message is safe only when both active verdicts are valid and safe.

**Tech Stack:** Next.js 16, TypeScript, OpenAI SDK, NVIDIA NIM, Gemini OpenAI-compatible API, Node deterministic tests.

## Global Constraints

- Do not weaken the unsafe threshold, consent gate, authentication gate, or rate limit.
- Any classifier error, malformed classifier JSON, or unsafe verdict must block the request.
- NVIDIA Llama Guard remains the first-choice primary classifier whenever it replies.
- No secret, API key, or user prompt may be logged.
- Preserve the existing dirty worktree; do not commit or push.

---

### Task 1: Strict Gemini replacement for an unavailable NVIDIA guard

**Files:**
- Modify: `src/lib/moderation.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `tests/deterministic.mjs`

**Interfaces:**
- Consumes: `getGuardClient(): OpenAI | null`, `getChatClient(): { client: OpenAI; model: string }`.
- Produces: `moderate(guardClient: OpenAI | null, kidnetClient: OpenAI, kidnetModel: string, text: string): Promise<ModerationResult>`.

- [ ] **Step 1: Write failing fallback tests**

In `tests/deterministic.mjs`, add a Gemini-shaped fake which returns valid JSON based on a distinct primary-safety system prompt. Assert both cases:

```js
const noNvidiaSafe = await moderate(null, safeGemini, "gemini-test", "Расскажи мне про город Херсон");
check("safe text passes when the unavailable NVIDIA guard is replaced by two valid Gemini checks", noNvidiaSafe.safe === true);

const noNvidiaUnsafe = await moderate(null, unsafePrimaryGemini, "gemini-test", "опасный запрос");
check("an unsafe Gemini primary fallback still blocks", noNvidiaUnsafe.safe === false);
```

- [ ] **Step 2: Verify RED**

Run: `npm test`

Expected: the safe fallback assertion fails because the current implementation treats an unavailable NVIDIA client as `fail-closed` even when kidNet replies safe.

- [ ] **Step 3: Implement the minimum strict fallback**

In `src/lib/moderation.ts`:

```ts
async function geminiPrimaryGuard(client: OpenAI, model: string, text: string): Promise<Internal> {
  // Call the existing chat-completions client with a primary-harm taxonomy prompt.
  // Parse only {"unsafe": true|false, "category": string}; parse/network errors return { error: true }.
}

export async function moderate(
  guardClient: OpenAI | null,
  kidnetClient: OpenAI,
  kidnetModel: string,
  text: string,
): Promise<ModerationResult> {
  const [nvidia, kidnet] = await Promise.all([
    guardClient ? llamaGuard(guardClient, text) : Promise.resolve({ safe: true, category: "", source: "llama-guard", error: true }),
    kidNet(kidnetClient, kidnetModel, text),
  ]);
  const primary = nvidia.error ? await geminiPrimaryGuard(kidnetClient, kidnetModel, text) : nvidia;
  // Return unsafe for either unsafe verdict; return fail-closed for either error; otherwise safe.
}
```

In `src/app/api/chat/route.ts`, call `moderate(guardClient, chat.client, chat.model, userPrompt)` for input and output, rather than substituting `chat.client` into the NVIDIA-only guard slot.

- [ ] **Step 4: Verify GREEN**

Run: `npm test && npm run lint && npm run build`

Expected: deterministic suite, lint, and TypeScript production build exit 0.

### Task 2: Re-run release evidence

**Files:**
- Modify: `tests/safety.test.mjs`
- Modify: `tests/live-safety-startup.test.mjs`
- Modify: `docs/DEPLOY-CHECKLIST.md`

**Interfaces:**
- Consumes: Task 1 strict fallback and the existing 20-second per-request timeout.
- Produces: a bounded 10-minute live suite which finishes all sequential provider checks and release evidence with the exact production deployment ID.

- [ ] **Step 1: Verify the live-suite budget regression**

Run: `node tests/live-safety-startup.test.mjs`

Expected: PASS; its source contract requires the default global deadline to be at least `600000` ms while each request remains independently bounded.

- [ ] **Step 2: Verify actual provider behavior**

Run: `npm run test:live`

Expected: all unsafe and AZ-insult requests block; `Херсон` and normal lesson talk pass; silhouette remains deterministic and no-echo.

- [ ] **Step 3: Run the full release gate**

Run: `npm run verify:release`

Expected: audit reports zero production vulnerabilities; all deterministic, consent, lifecycle, proxy, safety, browser-matrix and build checks exit 0.

- [ ] **Step 4: Deploy and canary**

Run: `vercel deploy --prod --yes`, then probe `https://academy.volaura.app`.

Expected: canonical root/sign-in/sign-up return 200, private APIs return 401 anonymously, the public silhouette returns neutral copy, and the live registration form remains Russian with no console errors.

Record the deployment ID, zero-vulnerability audit result, provider-fallback evidence, and
the remaining non-legal human review note in `docs/DEPLOY-CHECKLIST.md`.
