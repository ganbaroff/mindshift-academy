import type { SessionContent } from "../types";

export const week3Session2: SessionContent = {
  id: "w3-s2",
  week: 3,
  session: 2,
  concept: "conditions",
  misconception: "сработало на одном примере — значит работает всегда",
  titleRu: "А если нет?",
  explanationRu: "Если правило молчит про неудобный случай, монстр замирает в тупике. Ветка «иначе» закрывает дыру.",
  dinnerQuestionRu: "Спросите: «Правило сработало один раз — значит всегда?» Пусть ребёнок придумает случай, где то же правило сломается.",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w3s2-collision",
      role: "collision",
      family: "rule-runner",
      tier: 1,
      promptRu: "Добавь ветку «иначе». Правило прогонится на трёх картах, включая ловушку.",
      hintRu: "А что делать, когда условие НЕ выполнилось?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w3s2-p1",
      role: "practice",
      family: "rule-runner",
      tier: 1,
      promptRu: "Если ловушка — стой, иначе шаг. Скажи правило с «иначе».",
      hintRu: "Назови и «то», и «иначе».",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w3s2-p2",
      role: "practice",
      family: "rule-runner",
      tier: 1,
      promptRu: "Правило должно пройти открытую клетку, стену и ловушку.",
      hintRu: "Без «иначе» на ловушке монстр замирает без инструкции.",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w3s2-p3",
      role: "practice",
      family: "rule-runner",
      tier: 2,
      promptRu: "Уточни «иначе», чтобы неудобный случай не ломал прогон.",
      hintRu: "Что делать, когда условие не сработало?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    },
    {
      id: "w3s2-transfer",
      role: "transfer",
      family: "rule-runner",
      tier: 1,
      promptRu: "Сортировка: есть «лишний» случай. Скажи правило с явной веткой иначе.",
      hintRu: "А если условие не подошло — что тогда?",
      ruleMaps: [
        { id: "m-open", ahead: "open", successWhen: "goal" },
        { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
        { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      ],
    }
  ],
};
