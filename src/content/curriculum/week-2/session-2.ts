import type { SessionContent } from "../types";

export const week2Session2: SessionContent = {
  id: "w2-s2",
  week: 2,
  session: 2,
  concept: "decomposition",
  misconception: "шаги можно перечислить в любом порядке, и так понятно",
  titleRu: "Пропущенный шаг",
  explanationRu: "Если в плане дыра, монстр спотыкается между двумя шагами. Нужно найти, чего не хватает, и вставить недостающий шаг.",
  dinnerQuestionRu: "Попроси ребёнка рассказать утренний распорядок так, чтобы робот не перепутал порядок. Где шаги можно было сказать в любом порядке — и почему так нельзя?",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w2s2-collision",
      role: "collision",
      family: "sequence-world",
      tier: 1,
      promptRu: "Попробуй подать сэндвич, пропустив один важный шаг. Где монстр остановится?",
      hintRu: "Между какими двумя шагами что-то потерялось?",
    },
    {
      id: "w2s2-p1",
      role: "practice",
      family: "sequence-world",
      tier: 1,
      promptRu: "Вставь недостающий шаг так, чтобы путь до «подать» стал полным.",
      hintRu: "Без ножа масло не намазать — какой шаг пропал?",
    },
    {
      id: "w2s2-p2",
      role: "practice",
      family: "sequence-world",
      tier: 1,
      promptRu: "Собери план снова: ни одного пропущенного действия до подачи.",
      hintRu: "Проговори шаги вслух и проверь, что между ними нет дыры.",
    },
    {
      id: "w2s2-p3",
      role: "practice",
      family: "sequence-world",
      tier: 2,
      promptRu: "Найди дыру в почти готовом плане и почини одной вставкой.",
      hintRu: "Смотри, после какого шага предусловие следующего ещё не выполнено.",
    },
    {
      id: "w2s2-transfer",
      role: "transfer",
      family: "sequence-world",
      tier: 1,
      promptRu: "Рецепт: один шаг пропущен. Восстанови полный порядок до подачи.",
      hintRu: "Между какими двумя шагами пропало действие?",
    }
  ],
};
