import type { SessionContent } from "../types";

export const week2Session1: SessionContent = {
  id: "w2-s1",
  week: 2,
  session: 1,
  concept: "decomposition",
  misconception: "шаги можно перечислить в любом порядке, и так понятно",
  titleRu: "Сначала — потом",
  explanationRu: "Порядок шагов меняет результат. Если сказать «пройти» раньше «открыть дверь», монстр упрётся носом — он делает шаги строго по списку.",
  dinnerQuestionRu: "Попроси ребёнка рассказать утренний распорядок так, чтобы робот не перепутал порядок. Где шаги можно было сказать в любом порядке — и почему так нельзя?",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w2s1-collision",
      role: "collision",
      family: "sequence-world",
      tier: 1,
      promptRu: "Скажи шаги для сэндвича в любом порядке — попробуй. Смотри, что получится.",
      hintRu: "Что должно случиться РАНЬШЕ, чтобы получилось потом?",
    },
    {
      id: "w2s1-p1",
      role: "practice",
      family: "sequence-world",
      tier: 1,
      promptRu: "Собери сэндвич по шагам так, чтобы монстр дошёл до «подать».",
      hintRu: "Сначала инструмент, потом хлеб, потом намазать — иначе шаг невозможен.",
    },
    {
      id: "w2s1-p2",
      role: "practice",
      family: "sequence-world",
      tier: 1,
      promptRu: "Перечисли шаги ещё раз. Порядок должен быть рабочим с первого шага.",
      hintRu: "Если намазать раньше, чем взять нож — монстр остановится.",
    },
    {
      id: "w2s1-p3",
      role: "practice",
      family: "sequence-world",
      tier: 2,
      promptRu: "Скажи полный рабочий план: от ножа до подачи.",
      hintRu: "Проверь: каждый следующий шаг возможен после предыдущего.",
    },
    {
      id: "w2s1-transfer",
      role: "transfer",
      family: "sequence-world",
      tier: 1,
      promptRu: "Утренний распорядок монстра: назови шаги сэндвича в правильном порядке — как «сначала — потом» в быту.",
      hintRu: "Что должно быть раньше, чтобы потом получилось?",
    }
  ],
};
