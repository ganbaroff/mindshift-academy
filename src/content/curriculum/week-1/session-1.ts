import type { SessionContent } from "../types";

/**
 * Week 1 Session 1 — Точность: the monster does exactly what it is told.
 * Authoring target ~8–12 tasks; this ships a first playable spine.
 */
export const week1Session1: SessionContent = {
  id: "w1-s1",
  week: 1,
  session: 1,
  concept: "precision",
  misconception: "Если сказать общее слово вроде «домик», монстр сам догадается.",
  titleRu: "Монстр слышит только то, что сказано",
  explanationRu:
    "Монстр не угадывает. Он делает ровно то, что ты назвал — клетку за клеткой. Если чего-то не хватает, картинка будет неполной, и это нормально: так видно, что ещё нужно сказать.",
  dinnerQuestionRu:
    "Попроси ребёнка описать дорогу до кухни так, чтобы робот не ошибся ни на один шаг. Где он был недостаточно точен?",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w1s1-collision",
      role: "collision",
      family: "grid-draw",
      tier: 1,
      promptRu: "Скажи монстру, как закрасить верхний ряд. Попробуй своими словами.",
      target: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
      ],
    },
    {
      id: "w1s1-p1",
      role: "practice",
      family: "grid-draw",
      tier: 1,
      promptRu: "Закрась весь левый столбец.",
      target: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
    },
    {
      id: "w1s1-p2",
      role: "practice",
      family: "grid-draw",
      tier: 1,
      promptRu: "Закрась нижний ряд целиком.",
      target: [
        [3, 0],
        [3, 1],
        [3, 2],
        [3, 3],
      ],
    },
    {
      id: "w1s1-p3",
      role: "practice",
      family: "grid-draw",
      tier: 1,
      promptRu: "Закрась две клетки: строка 2 столбец 1 и строка 2 столбец 2.",
      target: [
        [1, 0],
        [1, 1],
      ],
    },
    {
      id: "w1s1-p4",
      role: "practice",
      family: "grid-draw",
      tier: 2,
      promptRu: "В верхнем ряду закрась первые три клетки слева.",
      target: [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
    },
    {
      id: "w1s1-p5",
      role: "practice",
      family: "grid-draw",
      tier: 2,
      promptRu: "Во втором ряду закрась две клетки справа.",
      target: [
        [1, 2],
        [1, 3],
      ],
    },
    {
      id: "w1s1-transfer",
      role: "transfer",
      family: "grid-draw",
      tier: 1,
      promptRu:
        "Новая картинка: закрась весь правый столбец. Скажи так, чтобы совпало клетка в клетку.",
      target: [
        [0, 3],
        [1, 3],
        [2, 3],
        [3, 3],
      ],
    },
  ],
};
