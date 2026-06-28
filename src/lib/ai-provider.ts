import OpenAI from "openai";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";
const OPENAI_MODEL = "gpt-4o-mini";

export function getAIClient(): { client: OpenAI; model: string } | null {
  // Priority: NVIDIA (free tier) → OpenAI (paid)
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (nvidiaKey && nvidiaKey !== "YOUR_API_KEY_HERE") {
    return {
      // 8s timeout + no retries bounds EVERY call made through this client
      // (chat judge/tutor, moderation classifiers, silhouette) — no hung kid waits.
      client: new OpenAI({ apiKey: nvidiaKey, baseURL: NVIDIA_BASE_URL, timeout: 8000, maxRetries: 0 }),
      model: NVIDIA_MODEL,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey !== "YOUR_API_KEY_HERE") {
    return {
      client: new OpenAI({ apiKey: openaiKey, timeout: 8000, maxRetries: 0 }),
      model: OPENAI_MODEL,
    };
  }

  return null; // No API key — use fallback
}
