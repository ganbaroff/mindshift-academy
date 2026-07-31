/**
 * Scan child-facing strings for U+FFFD / common mojibake (red gate #12).
 */

export function findMojibake(text: string): string[] {
  const hits: string[] = [];
  if (text.includes("\uFFFD")) hits.push("U+FFFD");
  if (/Ã.|Â.|Ð.|Ñ./.test(text) && /[^\x00-\x7F]/.test(text)) {
    // Heuristic: Latin-1 mis-decoded UTF-8 clusters often look like Ã/Â + high bytes.
    // Only flag when accompanied by replacement-like pairs common in RU mojibake.
    if (/Ã[А-яA-Za-z]|Ð[^\s]|Ñ[^\s]/.test(text)) hits.push("latin1-mojibake");
  }
  return hits;
}

export function assertNoMojibake(text: string, label = "copy"): void {
  const hits = findMojibake(text);
  if (hits.length) throw new Error(`Mojibake in ${label}: ${hits.join(", ")}`);
}
