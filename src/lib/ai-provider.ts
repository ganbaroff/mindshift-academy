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
