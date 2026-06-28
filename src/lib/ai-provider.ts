import OpenAI from "openai";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";
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
