### Task 1: Strict Gemini replacement for an unavailable NVIDIA guard

**Files:**
- Modify: `src/lib/moderation.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `tests/deterministic.mjs`

**Interfaces:**
- Consumes: `getGuardClient(): OpenAI | null`, `getChatClient(): { client: OpenAI; model: string }`.
- Produces: `moderate(guardClient: OpenAI | null, kidnetClient: OpenAI, kidnetModel: string, text: string): Promise<ModerationResult>`.

**Global constraints:**
- Do not weaken the unsafe threshold, consent gate, authentication gate, or rate limit.
- Any classifier error, malformed classifier JSON, or unsafe verdict must block the request.
- NVIDIA Llama Guard remains the first-choice primary classifier whenever it replies.
- No secret, API key, or user prompt may be logged.
- Preserve the existing dirty worktree; do not commit or push.

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
