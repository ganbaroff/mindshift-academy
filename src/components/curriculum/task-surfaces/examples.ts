import type { TaskFamilyId } from "@/lib/tasks/types";

export type WorkedExampleContent = {
  situation: string;
  action: string;
  result: string;
};

export const WORKED_EXAMPLES: Record<TaskFamilyId, WorkedExampleContent> = {
  "grid-draw": {
    situation: "На маленьком поле нужно закрасить две клетки нижнего ряда.",
    action: "Выбираем клетки: ряд 2, столбец 1; ряд 2, столбец 2.",
    result: "Получается короткая линия внизу.",
  },
  "sequence-world": {
    situation: "Нужно вымыть руки.",
    action: "Открыть воду → намочить руки → намылить → смыть.",
    result: "Шаги идут по порядку, и ни один нужный шаг не потерян.",
  },
  "rule-runner": {
    situation: "Мы решаем, брать ли зонт.",
    action: "Если идёт дождь — взять зонт; если дождя нет — идти без него.",
    result: "Одно правило подсказывает действие в двух разных случаях.",
  },
  "pattern-expand": {
    situation: "Последовательность начинается с 10 и растёт на 5.",
    action: "Короткое правило: начало 10, шаг +5.",
    result: "По правилу получаем 10, 15, 20, 25…",
  },
  "claim-check": {
    situation: "Проверяем фразу: «У квадрата четыре стороны».",
    action: "Считаем стороны и отмечаем «Верно».",
    result: "Метка опирается на проверку, а не на уверенный голос.",
  },
};
