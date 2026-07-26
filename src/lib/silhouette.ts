// P0-PRIV seam: the PUBLIC landing "silhouette" preview is DETERMINISTIC BY DESIGN. This
// module holds the pure, no-egress logic used by /api/generate-silhouette so it can be
// asserted offline (see tests/deterministic.mjs) and so the route stays trivially free of
// any external-AI / moderation import. Child free-text never leaves the app on this path
// (no generative model AND no llama-guard/kidNet classifier), so no parental consent is
// required for the preview. The real, AI-generated monster is made post-consent in
// /api/monster. Keeping this pure also makes the preview instant, free, and immune to LLM
// quota burn from the unauthenticated funnel.

// Deterministic seed from the 3 words — a stable hash, NOT an echo of the raw text.
export function hashWords(words: string[]): number {
  let hash = 0;
  for (const word of words) {
    for (let index = 0; index < word.length; index += 1) {
      hash = (hash * 31 + word.charCodeAt(index)) % 1000;
    }
  }
  return hash;
}

export const fallbackEmojis = ["🐉", "👾", "🦊", "🤖", "🦄", "🐼", "🦖", "🦁", "🐙", "🧙"];
export const fallbackColors = [
  "#a78bfa", // Purple-soft
  "#4ecdc4", // Teal
  "#f59e0b", // Gold
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#ec4899", // Pink
];
export const fallbackNames = ["Огняш", "Бублик", "Зефир", "Шустрик", "Кристаллик", "Луник"];

export type Silhouette = {
  name: string;
  emoji: string;
  color: string;
  description: string;
};

export function deterministicSilhouette(words: string[]): Silhouette {
  const seed = hashWords(words);
  const emoji = fallbackEmojis[seed % fallbackEmojis.length];
  const color = fallbackColors[seed % fallbackColors.length];
  const name = fallbackNames[seed % fallbackNames.length];
  // Do NOT reflect the raw child words back: no server-side moderation runs on this
  // pre-consent path, so unmoderated input must never be echoed into the response.
  const description = "Вот предварительный силуэт будущего персонажа.";
  return { name, emoji, color, description };
}
