import OpenAI from "openai";

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

// CHAT client (kidNet secondary classifier + judge + tutor): Gemini when GEMINI_API_KEY is set,
// else fall back to the current NVIDIA client+model, then OpenAI. Same 12s/8s timeout bounds.
export function getChatClient(): { client: OpenAI; model: string } | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "YOUR_API_KEY_HERE") {
    return {
      client: withGeminiDefaults(
        new OpenAI({ apiKey: geminiKey, baseURL: GEMINI_BASE_URL, timeout: 12000, maxRetries: 0 })
      ),
      model: GEMINI_MODEL,
    };
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (nvidiaKey && nvidiaKey !== "YOUR_API_KEY_HERE") {
    return {
      client: new OpenAI({ apiKey: nvidiaKey, baseURL: NVIDIA_BASE_URL, timeout: 12000, maxRetries: 0 }),
      model: NVIDIA_MODEL,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== "YOUR_API_KEY_HERE") {
    return {
      client: new OpenAI({ apiKey: openaiKey, timeout: 12000, maxRetries: 0 }),
      model: OPENAI_MODEL,
    };
  }

  return null; // No API key — use fallback
}

export function getAIClient(): { client: OpenAI; model: string } | null {
  // Priority: NVIDIA (free tier) → OpenAI (paid)
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (nvidiaKey && nvidiaKey !== "YOUR_API_KEY_HERE") {
    return {
      // 12s timeout + no SDK retries bounds EVERY call through this client (chat judge/tutor,
      // moderation, silhouette). Moderation adds ONE explicit timeout-only retry on top
      // (moderation.ts) so the slow free-tier model doesn't false-block a safe child message.
      client: new OpenAI({ apiKey: nvidiaKey, baseURL: NVIDIA_BASE_URL, timeout: 12000, maxRetries: 0 }),
      model: NVIDIA_MODEL,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== "YOUR_API_KEY_HERE") {
    return {
      client: new OpenAI({ apiKey: openaiKey, timeout: 12000, maxRetries: 0 }),
      model: OPENAI_MODEL,
    };
  }

  return null; // No API key — use fallback
}
