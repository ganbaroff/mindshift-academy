/**
 * Scan child-facing strings for U+FFFD / common mojibake / ASCII "?" corruption (red gate #12).
 * The "?" class catches Cyrillic destroyed by wrong-encoding writes (literal ??? runs).
 */

const STRING_LITERAL_RE =
  /(["'`])(?:\\.|(?!\1)[\s\S])*?\1/g;

/** Extract JS/TS string literal contents (no quotes). */
export function extractStringLiterals(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(STRING_LITERAL_RE.source, "g");
  while ((m = re.exec(text))) {
    const raw = m[0];
    // Skip template literals with ${...} interpolations — still scan static parts lightly
    const body = raw.slice(1, -1);
    out.push(body);
  }
  return out;
}

export function findMojibake(text: string): string[] {
  const hits: string[] = [];
  if (text.includes("\uFFFD")) hits.push("U+FFFD");
  if (/Ã.|Â.|Ð.|Ñ./.test(text) && /[^\x00-\x7F]/.test(text)) {
    // Heuristic: Latin-1 mis-decoded UTF-8 clusters often look like Ã/Â + high bytes.
    // Only flag when accompanied by replacement-like pairs common in RU mojibake.
    if (/Ã[А-яA-Za-z]|Ð[^\s]|Ñ[^\s]/.test(text)) hits.push("latin1-mojibake");
  }
  // ASCII question-mark runs inside string literals (encoding-destroyed Cyrillic)
  for (const lit of extractStringLiterals(text)) {
    if (/\?{3,}/.test(lit)) {
      hits.push("ascii-question-corruption");
      break;
    }
  }
  return hits;
}

export function assertNoMojibake(text: string, label = "copy"): void {
  const hits = findMojibake(text);
  if (hits.length) throw new Error(`Mojibake in ${label}: ${hits.join(", ")}`);
}
