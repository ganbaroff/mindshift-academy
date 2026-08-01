import type { SessionContent } from "../types";

export const week5Session2: SessionContent = {
  id: "w5-s2",
  week: 5,
  session: 2,
  concept: "verification",
  misconception: "если ИИ ответил уверенно, значит правильно",
  titleRu: "Почини, не переписывай",
  explanationRu: "Не выбрасывай правило целиком. Найди самую маленькую правку — и все карты снова проходят.",
  dinnerQuestionRu: "Спросите: «Если кто-то ответил очень уверенно — как проверить, а не поверить?» Пусть ребёнок предложит одну проверку.",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w5s2-collision",
      role: "collision",
      family: "rule-runner",
      tier: 1,
      promptRu: "Правило почти работает, но падает на одной карте. Почини минимально.",
      hintRu: "Что самое МАЛЕНЬКОЕ можно изменить?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w5s2-p1",
      role: "practice",
      family: "rule-runner",
      tier: 1,
      promptRu: "Добавь или уточни одну ветку, чтобы ловушка и стена были безопасны.",
      hintRu: "Одна маленькая правка, не новое правило с нуля.",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w5s2-p2",
      role: "practice",
      family: "rule-runner",
      tier: 1,
      promptRu: "Прогони починенное правило по всем трём картам.",
      hintRu: "Минимальное изменение до рабочего прогона.",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w5s2-p3",
      role: "practice",
      family: "rule-runner",
      tier: 2,
      promptRu: "Ещё раз: почини так, чтобы открытая, стена и ловушка проходили.",
      hintRu: "Самое маленькое изменение.",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w5s2-transfer",
      role: "transfer",
      family: "rule-runner",
      tier: 1,
      promptRu: "Перенос: минимально почини «сломанный план» — скажи рабочее правило для трёх карт.",
      hintRu: "Что самое маленькое можно изменить?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    }
  ],
};
