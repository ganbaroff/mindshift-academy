/**
 * Lesson-specific minimum evidence in a generated tutor reply. Most lesson
 * personas have broad natural-language variants; lesson 3 is different: its
 * learning outcome is a visible transformation, so a reply with no cipher
 * marker does not demonstrate the taught rule even when the judge accepted the
 * child's prompt.
 */
export function isLessonRelevantTutorReply(stepId: number, reply: string): boolean {
  if (stepId !== 3) return true;
  return /\*|шифр|гласн|зв[её]зд/iu.test(reply);
}
