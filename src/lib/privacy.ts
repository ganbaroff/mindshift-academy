// COPPA data-minimization (defense-in-depth — NOT full anonymization).
//
// The chat sends the child's message to NVIDIA three ways: moderation, the
// comprehension judge, and the tutor reply. Moderation MUST see the RAW text —
// catching a child who shares PII or a groomer who asks for it is literally the
// classifier's job, and its result is neither stored nor returned to anyone. But
// the JUDGE and TUTOR calls (which generate returned/visible content) don't need
// identifiers, so they receive a minimized copy: obvious direct identifiers
// (emails, phone-like sequences, long digit runs) are stripped before egress.
//
// This REDUCES, not eliminates, identifiable text sent to the LLM. Free-text
// names/addresses need NER and a fuller scrub — tracked as a separate step.

const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
// phone-like: a digit, then 6+ of [digit/space/dot/dash/paren/plus], then a digit
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;
// any remaining bare run of 5+ digits (ids, postal codes, card-ish)
const LONG_DIGITS = /\b\d{5,}\b/g;

/** Strip obvious direct identifiers from child text before it leaves for an LLM. */
export function minimizeChildText(text: string): string {
  if (!text) return text;
  return text
    .replace(EMAIL, "[email]")
    .replace(PHONE, "[number]")
    .replace(LONG_DIGITS, "[number]");
}
