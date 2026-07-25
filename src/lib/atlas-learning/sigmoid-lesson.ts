/**
 * Sigmoid lesson formats mapped from Atlas NBA actions.
 */

import type { LearningAction } from "./contracts";

export type SigmoidLessonFormat = "sigmoid-visual" | "sigmoid-grill" | "sigmoid-flashcards" | "sigmoid-default";

export interface SigmoidLessonContent {
  format: SigmoidLessonFormat;
  title: string;
  prompt: string;
  /** Minimal render hint for client / E2E assertions. */
  renderMarker: string;
  cards?: Array<{ front: string; back: string }>;
}

const VISUAL_LESSON: SigmoidLessonContent = {
  format: "sigmoid-visual",
  title: "Sigmoid — визуальное объяснение",
  prompt:
    "Sigmoid сжимает любое число в диапазон от 0 до 1. Представь горку: слева почти 0, справа почти 1, в центре резкий подъём.",
  renderMarker: "data-lesson-format=sigmoid-visual",
};

const GRILL_LESSON: SigmoidLessonContent = {
  format: "sigmoid-grill",
  title: "Sigmoid — устный допрос",
  prompt:
    "Объясни своими словами: почему sigmoid подходит для вероятности? Ответь текстом или вслух.",
  renderMarker: "data-lesson-format=sigmoid-grill",
};

const FLASHCARDS_LESSON: SigmoidLessonContent = {
  format: "sigmoid-flashcards",
  title: "Sigmoid — карточки",
  prompt: "Прокрути карточки и запомни ключевые факты о sigmoid.",
  renderMarker: "data-lesson-format=sigmoid-flashcards",
  cards: [
    { front: "Формула sigmoid", back: "σ(x) = 1 / (1 + e^(-x))" },
    { front: "Диапазон выхода", back: "От 0 до 1 — удобно для вероятности" },
    { front: "Центр кривой", back: "При x=0 выход = 0.5" },
  ],
};

/** Map Atlas action → VOLAURA lesson content. */
export function mapActionToSigmoidLesson(action: LearningAction): SigmoidLessonContent {
  switch (action) {
    case "VISUAL_EXPLANATION":
    case "SCHEMA_DIAGRAM":
      return VISUAL_LESSON;
    case "GRILL_ME":
    case "TEXT_EXPLANATION":
    case "AUDIO_EXPLANATION":
      return GRILL_LESSON;
    case "FLASHCARDS":
      return FLASHCARDS_LESSON;
    default:
      return {
        ...VISUAL_LESSON,
        format: "sigmoid-default",
        title: "Sigmoid — практика",
        renderMarker: "data-lesson-format=sigmoid-default",
      };
  }
}

/** Render HTML snippet for E2E / lesson page assertions. */
export function renderSigmoidLessonHtml(content: SigmoidLessonContent): string {
  const cards = content.cards
    ? `<ul>${content.cards.map((c) => `<li>${c.front} → ${c.back}</li>`).join("")}</ul>`
    : "";
  return `<section ${content.renderMarker}><h2>${content.title}</h2><p>${content.prompt}</p>${cards}</section>`;
}
