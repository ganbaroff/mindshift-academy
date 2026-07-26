/**
 * Pre-written replies used only after output moderation blocks a generated tutor reply.
 * They keep the child in the current lesson without weakening or bypassing moderation.
 */
const LESSON_FALLBACKS: Record<number, string> = {
  1: "Ты назвал три качества — я начинаю просыпаться и согреваться! ✨",
  2: "Принято! Теперь я буду говорить весело и добавлять огонёк к словам! 🔥",
  3: "Ш*фр включён: теперь гл*сны* в моих словах превращаются в звёздочки! 🔐",
  4: "Понял: на картинке собака, а не кошка. Спасибо, что помог мне исправиться! 🐶",
  5: "Правило принято: если впереди стена — поверну налево, иначе пойду вперёд! 🧭",
};

const GENERIC_FALLBACK = "Давай продолжим урок — я готов попробовать твою команду ещё раз! 🐲";

export function safeLessonFallback(stepId: number): string {
  return LESSON_FALLBACKS[stepId] ?? GENERIC_FALLBACK;
}
