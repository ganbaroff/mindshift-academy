import type { SessionContent } from "../types";

/**
 * Week 2 · session 3 — a goal the child owns.
 *
 * Leaving the house is the only world of the three where the order is not forced by physics
 * but by consequence: boots before coat is a preference, keys before the door is not. That
 * distinction — which steps really must come first, and which only feel like they must — is
 * the last thing week 2 has to teach before the monster grows its arms.
 *
 * It closes the week, so it also closes the loop: the transfer task walks back into the very
 * first world of the week and asks for the same skill there.
 */
export const week2Session3: SessionContent = {
  id: "w2-s3",
  week: 2,
  session: 3,
  concept: "decomposition",
  misconception: "большую цель можно назвать одним шагом — «собраться и выйти»",
  titleRu: "Большое дело — маленькие шаги",
  explanationRu:
    "«Выйти на улицу» — не шаг, а название пяти шагов. Монстр не умеет собираться: он умеет надеть, взять, открыть, выйти, закрыть. Большая цель работает только тогда, когда разложена на то, что он умеет.",
  dinnerQuestionRu:
    "Спроси ребёнка, из скольких шагов состоит «собраться в школу». Пусть назовёт их вслух, а потом найдёт два, которые можно поменять местами без вреда — и один, который нельзя.",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w2s3-collision",
      role: "collision",
      family: "sequence-world",
      worldId: "leaving",
      tier: 1,
      promptRu: "Скажи мне «собраться и выйти» шагами. Я умею только то, что на кнопках.",
      hintRu: "Возьми большую цель и спроси: из чего она состоит? Каждый кусок — отдельный шаг.",
      goalRu: "разложить «собраться и выйти» на шаги, которые монстр умеет",
      givenRu: ["куртка", "ботинки", "рюкзак", "ключи на полке", "закрытая дверь"],
      doneWhenRu: "получится, когда я выйду и запру дверь",
      doneWhenFullRu:
        "Я делаю только те шаги, что ты назвал. «Собраться» я не умею — умею надеть, взять, открыть, выйти, закрыть.",
    },
    {
      id: "w2s3-p1",
      role: "practice",
      family: "sequence-world",
      worldId: "leaving",
      tier: 1,
      promptRu: "Ключи лежат на полке в прихожей. Скажи порядок, в котором дверь окажется запертой.",
      hintRu: "Спроси себя: где я буду стоять, когда захочу запереть дверь — и что должно быть у меня в руках уже тогда?",
      goalRu: "запереть дверь снаружи",
      givenRu: ["куртка", "ботинки", "рюкзак", "ключи на полке", "закрытая дверь"],
      doneWhenRu: "получится, когда ключи будут у меня раньше, чем я выйду",
      doneWhenFullRu:
        "С улицы до полки в прихожей я не дотянусь. Ключи должны оказаться у меня до шага «выйти».",
    },
    {
      id: "w2s3-p2",
      role: "practice",
      family: "sequence-world",
      worldId: "leaving",
      tier: 1,
      promptRu: "Рюкзак надевают поверх куртки. Скажи порядок, в котором оба окажутся на мне.",
      hintRu: "Два шага, которые кажутся независимыми, на самом деле спорят друг с другом. Кто из них первый?",
      goalRu: "надеть и куртку, и рюкзак",
      givenRu: ["куртка", "ботинки", "рюкзак", "ключи на полке", "закрытая дверь"],
      doneWhenRu: "получится, когда куртка окажется на мне раньше рюкзака",
      doneWhenFullRu:
        "Через надетый рюкзак куртку не натянуть. Порядок здесь диктует не привычка, а лямки.",
    },
    {
      id: "w2s3-p3",
      role: "practice",
      family: "sequence-world",
      worldId: "leaving",
      tier: 2,
      promptRu: "Скажи весь план от прихожей до запертой двери.",
      hintRu: "Проверь план с конца: чтобы запереть — надо выйти; чтобы выйти — надо открыть и одеться.",
      goalRu: "назвать полный план от прихожей до запертой двери",
      givenRu: ["куртка", "ботинки", "рюкзак", "ключи на полке", "закрытая дверь"],
      doneWhenRu: "получится, когда я пройду весь план и запру дверь",
      doneWhenFullRu:
        "В плане нет шага, который я не смогу сделать, и последний шаг — «закрыть дверь».",
    },
    {
      id: "w2s3-transfer",
      role: "transfer",
      family: "sequence-world",
      // Back to the world week 2 opened in. Same skill, familiar table: if it only worked in
      // the hallway, it was the hallway that was learned.
      worldId: "sandwich",
      tier: 1,
      promptRu: "Дверь заперта, мы вернулись на кухню. Разложи «сделать обед» на шаги.",
      hintRu: "Большая цель снова названа одним словом. Из чего она состоит здесь?",
      goalRu: "разложить «сделать обед» на шаги, которые монстр умеет",
      givenRu: ["хлеб — два ломтика", "масло", "сыр", "нож", "тарелка"],
      doneWhenRu: "получится, когда я дойду до «подать»",
      doneWhenFullRu:
        "«Сделать обед» я не умею. Умею взять, положить, намазать, накрыть, подать — и делаю их в том порядке, в котором услышал.",
    },
  ],
};
