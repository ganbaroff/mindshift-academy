import type { SessionContent } from "../types";

export const week2Session3: SessionContent = {
  id: "w2-s3",
  week: 2,
  session: 3,
  concept: "decomposition",
  misconception: "шаги можно перечислить в любом порядке, и так понятно",
  titleRu: "Большое дело — маленькие шаги",
  explanationRu: "Большая цель — это две части: сначала подготовить, потом завершить. Разложи «достать и подать» на полный упорядоченный список.",
  dinnerQuestionRu: "Попроси ребёнка рассказать утренний распорядок так, чтобы робот не перепутал порядок. Где шаги можно было сказать в любом порядке — и почему так нельзя?",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w2s3-collision",
      role: "collision",
      family: "sequence-world",
      tier: 1,
      promptRu: "Цель: подать сэндвич. Назови шаги, не думая о «ключе» (ноже) — смотри, что выйдет.",
      hintRu: "Из каких двух больших частей состоит это дело?",
    },
    {
      id: "w2s3-p1",
      role: "practice",
      family: "sequence-world",
      tier: 1,
      promptRu: "Разложи цель на шаги: подготовка, сборка, подача.",
      hintRu: "Сначала инструмент и основа, потом начинка, потом закрыть и подать.",
    },
    {
      id: "w2s3-p2",
      role: "practice",
      family: "sequence-world",
      tier: 1,
      promptRu: "Ещё раз полный список до «подать» без пропусков.",
      hintRu: "Проверь обе большие части: подготовка и завершение.",
    },
    {
      id: "w2s3-p3",
      role: "practice",
      family: "sequence-world",
      tier: 2,
      promptRu: "Переупорядочь перепутанный план так, чтобы сэндвич можно было подать.",
      hintRu: "Какой шаг должен идти раньше другого?",
    },
    {
      id: "w2s3-transfer",
      role: "transfer",
      family: "sequence-world",
      tier: 1,
      promptRu: "Новая цель — тот же навык: полный упорядоченный план до подачи.",
      hintRu: "Из каких двух больших частей состоит дело?",
    }
  ],
};
