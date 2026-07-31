import type { SessionContent } from "../types";

export const week5Session1: SessionContent = {
  id: "w5-s1",
  week: 5,
  session: 1,
  concept: "verification",
  misconception: "если ИИ ответил уверенно, значит правильно",
  titleRu: "Монстр уверен. А ты?",
  explanationRu: "Уверенный тон не равен правде. Спроектируй проверку: пометь каждое утверждение верным или ложным.",
  dinnerQuestionRu: "Спросите: «Если кто-то ответил очень уверенно — как проверить, а не поверить?» Пусть ребёнок предложит одну проверку.",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w5s1-collision",
      role: "collision",
      family: "claim-check",
      tier: 1,
      promptRu: "Монстр уверенно говорит про картинку. Пометь каждое утверждение: верно или ложно.",
      hintRu: "Как проверить, а не поверить?",
      claims: [
              {
                      "id": "a",
                      "text": "В верхнем ряду четыре клетки закрашены.",
                      "truth": true
              },
              {
                      "id": "b",
                      "text": "Вся сетка пустая.",
                      "truth": false
              },
              {
                      "id": "c",
                      "text": "Есть хотя бы одна закрашенная клетка.",
                      "truth": true
              }
      ],
    },
    {
      id: "w5s1-p1",
      role: "practice",
      family: "claim-check",
      tier: 1,
      promptRu: "Проверь набор: часть верных, одно уверенно ложное.",
      hintRu: "Не верь тону — проверь каждое.",
      claims: [
              {
                      "id": "a",
                      "text": "2 + 2 = 4",
                      "truth": true
              },
              {
                      "id": "b",
                      "text": "После 1,2,3 всегда идёт «банан».",
                      "truth": false
              },
              {
                      "id": "c",
                      "text": "Правило «+1» даёт 1,2,3,4.",
                      "truth": true
              }
      ],
    },
    {
      id: "w5s1-p2",
      role: "practice",
      family: "claim-check",
      tier: 1,
      promptRu: "Ещё один набор утверждений монстра — пометь все.",
      hintRu: "Как проверить каждое?",
      claims: [
              {
                      "id": "a",
                      "text": "Открытая клетка — можно шагнуть.",
                      "truth": true
              },
              {
                      "id": "b",
                      "text": "В стену всегда нужно шагать.",
                      "truth": false
              },
              {
                      "id": "c",
                      "text": "Ловушка — опасный шаг вперёд.",
                      "truth": true
              }
      ],
    },
    {
      id: "w5s1-p3",
      role: "practice",
      family: "claim-check",
      tier: 2,
      promptRu: "Поймай уверенную ложь среди верных фактов.",
      hintRu: "Проверка важнее уверенности.",
      claims: [
              {
                      "id": "a",
                      "text": "Список из трёх чисел — ещё не правило.",
                      "truth": true
              },
              {
                      "id": "b",
                      "text": "Если сказано уверенно — всегда верно.",
                      "truth": false
              },
              {
                      "id": "c",
                      "text": "Нужно правило, чтобы продолжить ряд.",
                      "truth": true
              }
      ],
    },
    {
      id: "w5s1-transfer",
      role: "transfer",
      family: "claim-check",
      tier: 1,
      promptRu: "Перенос: проверь утверждения про закономерность недели 4.",
      hintRu: "Как проверить, а не поверить?",
      claims: [
              {
                      "id": "a",
                      "text": "Правило start=1 step=1 даёт 1,2,3.",
                      "truth": true
              },
              {
                      "id": "b",
                      "text": "Три примера всегда достаточны как правило.",
                      "truth": false
              },
              {
                      "id": "c",
                      "text": "Цикл из двух цветов повторяется.",
                      "truth": true
              }
      ],
    }
  ],
};
