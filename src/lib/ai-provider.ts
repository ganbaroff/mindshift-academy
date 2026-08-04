import OpenAI, { AzureOpenAI } from "openai";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
// MODEL AVAILABILITY FIX (2026-07-07): meta/llama-3.3-70b-instruct is currently UNREACHABLE
// on this NVIDIA NIM tier — every call to it hangs and times out (measured: no response at
// 45s/60s/90s), while meta/llama-guard-4-12b (0.4-0.7s) and meta/llama-3.1-8b-instruct
// (0.55-0.75s) respond fast. Because judge + kidNet + tutor all route through this model,
// the 70b hang made kidNet ALWAYS error → input moderation ALWAYS fail-closed → no lesson
// completable, no reward ever. Switching to the fast, working 8b instruct restores the loop.
// This is a provider-availability fix, NOT a safety change: llama-guard (primary harm
// classifier) is untouched, and moderation stays fail-closed. Revisit 70b when NVIDIA
// restores it on this tier. Measured via scripts/measure-nvidia*.mjs.
const NVIDIA_MODEL = "meta/llama-3.1-8b-instruct";
const OPENAI_MODEL = "gpt-4o-mini";

type ProviderEnv = Record<string, string | undefined>;
type AzureChatConfig = {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
};

function configured(value: string | undefined): string | null {
  const normalised = value?.trim();
  if (!normalised || /^(your_|dummy|configured-value$)/i.test(normalised)) return null;
  return normalised;
}

function azureChatConfig(env: ProviderEnv): AzureChatConfig | null {
  const apiKey = configured(env.AZURE_OPENAI_KEY) ?? configured(env.AZURE_OPENAI_KEY2);
  const endpoint = configured(env.AZURE_OPENAI_ENDPOINT);
  const deployment = configured(env.AZURE_OPENAI_DEPLOYMENT);
  const apiVersion = configured(env.AZURE_OPENAI_API_VERSION);
  return apiKey && endpoint && deployment && apiVersion
    ? { apiKey, endpoint, deployment, apiVersion }
    : null;
}

/** Pure routing seam for tests; never returns a credential or endpoint. */
export function selectChatProvider(env: ProviderEnv = process.env): "azure" | "gemini" | "nvidia" | "openai" | null {
  if (azureChatConfig(env)) return "azure";
  if (configured(env.GEMINI_API_KEY)) return "gemini";
  if (configured(env.NVIDIA_API_KEY)) return "nvidia";
  if (configured(env.OPENAI_API_KEY)) return "openai";
  return null;
}

// TWO-CLIENT SPLIT (2026-07-10): the whole chat (kidNet + judge + tutor) used to run on the ONE
// flaky free-tier NVIDIA model (meta/llama-3.1-8b-instruct), which times out intermittently →
// moderation fail-closes → chat unusable. FIX: keep the RELIABLE primary safety classifier
// (llama-guard-4-12b) on NVIDIA (getGuardClient), and move the flaky parts (kidNet + judge +
// tutor) to Google Gemini (gemini-2.5-flash) via the OpenAI-compat endpoint (getChatClient).
// gemini-2.5-flash is a STRONGER model than llama-3.1-8b, so the secondary net is not weakened.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_MODEL = "gemini-2.5-flash";

// gemini-2.5-flash is a THINKING model: its reasoning tokens count against max_tokens, so at the
// kidNet/judge budgets (~60/120) thinking eats the whole budget → completion_tokens:0 →
// finish_reason:'length' → EMPTY body → JSON.parse fails → moderate() fail-closes (reproduces the
// exact flap we're fixing). reasoning_effort:'none' yields valid JSON fast (~1.1s) at those budgets.
// We inject it at the CLIENT layer (default-on the Gemini chat client) so the request bodies in
// moderation.ts / route.ts stay UNTOUCHED — the moderation.ts diff must be client-routing ONLY.
// A caller that sets reasoning_effort itself overrides this default (spread after). Applied ONLY to
// the Gemini client: reasoning_effort is invalid on gpt-4o-mini and on the NVIDIA llama models.
function withGeminiDefaults(client: OpenAI): OpenAI {
  const completions = client.chat.completions;
  const origCreate = completions.create.bind(completions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (completions as any).create = (body: any, options?: any) =>
    origCreate({ reasoning_effort: "none", ...body }, options);
  return client;
}

// PRIMARY harm classifier client: llama-guard-4-12b STAYS on NVIDIA (reliable, ~0.5-1.3s, never
// flapped). Do NOT move it. Returns null only if the NVIDIA key is absent — callers fall the guard
// call back onto the chat client, where the guard model is missing → llamaGuard errors → fail-closed.
export function getGuardClient(): OpenAI | null {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (nvidiaKey && nvidiaKey !== "YOUR_API_KEY_HERE") {
    // Same 12s client-timeout + no SDK retries as the legacy client; per-call timeouts bound each call.
    return new OpenAI({ apiKey: nvidiaKey, baseURL: NVIDIA_BASE_URL, timeout: 12000, maxRetries: 0 });
  }
  return null;
}

// CHAT client (the child-facing tutor + lesson judge): Azure GPT takes precedence when its
// complete deployment config is present. Gemini, NVIDIA and direct OpenAI retain their existing
// fallback order. Safety is intentionally obtained separately via getSafetyClient().
export function getChatClient(): { client: OpenAI; model: string } | null {
  const azure = azureChatConfig(process.env);
  if (azure) {
    return {
      client: new AzureOpenAI({
        apiKey: azure.apiKey,
        endpoint: azure.endpoint,
        deployment: azure.deployment,
        apiVersion: azure.apiVersion,
        timeout: 12000,
        maxRetries: 0,
      }),
      model: azure.deployment,
    };
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (configured(geminiKey)) {
    return {
      client: withGeminiDefaults(
        new OpenAI({ apiKey: geminiKey, baseURL: GEMINI_BASE_URL, timeout: 12000, maxRetries: 0 })
      ),
      model: GEMINI_MODEL,
    };
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (configured(nvidiaKey)) {
    return {
      client: new OpenAI({ apiKey: nvidiaKey, baseURL: NVIDIA_BASE_URL, timeout: 12000, maxRetries: 0 }),
      model: NVIDIA_MODEL,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (configured(openaiKey)) {
    return {
      client: new OpenAI({ apiKey: openaiKey, timeout: 12000, maxRetries: 0 }),
      model: OPENAI_MODEL,
    };
  }

  return null; // No API key — use fallback
}

// SAFETY client remains independent from Azure tutor generation: Gemini powers kidNet and the
// strict Gemini primary fallback; NVIDIA is still available as a last-resort compatible client.
export function getSafetyClient(): { client: OpenAI; model: string } | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (configured(geminiKey)) {
    return {
      client: withGeminiDefaults(
        new OpenAI({ apiKey: geminiKey, baseURL: GEMINI_BASE_URL, timeout: 12000, maxRetries: 0 })
      ),
      model: GEMINI_MODEL,
    };
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (configured(nvidiaKey)) {
    return {
      client: new OpenAI({ apiKey: nvidiaKey, baseURL: NVIDIA_BASE_URL, timeout: 12000, maxRetries: 0 }),
      model: NVIDIA_MODEL,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (configured(openaiKey)) {
    return {
      client: new OpenAI({ apiKey: openaiKey, timeout: 12000, maxRetries: 0 }),
      model: OPENAI_MODEL,
    };
  }

  return null;
}

// Removed 2026-08-04: getAIClient() described an older NVIDIA→OpenAI-only order and had zero
// call sites, so it read like a second, contradicting answer to "which provider do we use?".
// The live order lives in getChatClient / getGuardClient / getSafetyClient above.
