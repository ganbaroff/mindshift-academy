import type { SessionContent } from "../types";

export const week3Session1: SessionContent = {
  id: "w3-s1",
  week: 3,
  session: 1,
  concept: "conditions",
  misconception: "сработало на одном примере — значит работает всегда",
  titleRu: "Если — то",
  explanationRu: "Список шагов без условия отлично идёт по одной карте и врезается в стену на другой. Нужно правило ЕСЛИ-ТО, которое смотрит вперёд.",
  dinnerQuestionRu: "Спросите: «Правило сработало один раз — значит всегда?» Пусть ребёнок придумает случай, где то же правило сломается.",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w3s1-collision",
      role: "collision",
      family: "rule-runner",
      tier: 1,
      promptRu: "Скажи одно правило ЕСЛИ-ТО для монстра. Оно прогонится на двух картах.",
      hintRu: "Что монстр должен ПРОВЕРИТЬ, прежде чем шагнуть?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
      ],
    },
    {
      id: "w3s1-p1",
      role: "practice",
      family: "rule-runner",
      tier: 1,
      promptRu: "Правило: если впереди свободно — шаг, если стена — стой. Скажи его своими словами.",
      hintRu: "Назови условие и действие явно.",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
      ],
    },
    {
      id: "w3s1-p2",
      role: "practice",
      family: "rule-runner",
      tier: 1,
      promptRu: "То же умение: правило должно работать и на открытой клетке, и у стены.",
      hintRu: "Проверь обе карты одним правилом.",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
      ],
    },
    {
      id: "w3s1-p3",
      role: "practice",
      family: "rule-runner",
      tier: 2,
      promptRu: "Уточни правило так, чтобы на стене монстр не шагал.",
      hintRu: "Что проверить перед шагом?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
      ],
    },
    {
      id: "w3s1-transfer",
      role: "transfer",
      family: "rule-runner",
      tier: 1,
      promptRu: "Светофор: если «стена» (красный) — стой, иначе шаг. Скажи правило.",
      hintRu: "Что проверить, прежде чем шагнуть?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
      ],
    }
  ],
};
