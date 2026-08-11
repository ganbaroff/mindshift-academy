import type { SessionContent } from "../types";

/**
 * Week 2 · session 2 — the step you did not say.
 *
 * The planting world is chosen for one property the kitchen does not have: a forgotten step
 * stays invisible. Skip the water and the first three steps still look perfect; the monster
 * only stops at the very end, holding a pot of dry soil. That is exactly what a missing step
 * feels like in real life, and it is why this session is not another sandwich.
 */
export const week2Session2: SessionContent = {
  id: "w2-s2",
  week: 2,
  session: 2,
  concept: "decomposition",
  misconception: "если шагов много, один пропущенный всё равно ничего не изменит",
  titleRu: "Пропущенный шаг",
  explanationRu:
    "Пропущенный шаг редко виден сразу. Монстр спокойно делает всё, что ты сказал, и упирается в конце: земля сухая, а он уже несёт горшок на свет. Дыра была в середине, а остановка — в конце.",
  dinnerQuestionRu:
    "Спроси ребёнка: если в рецепте пропустить шаг, это видно сразу или только в конце? Пусть придумает случай, где ошибку замечают самым последним.",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w2s2-collision",
      role: "collision",
      family: "sequence-world",
      worldId: "plant",
      tier: 1,
      promptRu: "Посади семечко, но не поливай. Досмотри, где я остановлюсь.",
      hintRu: "Смотри не на тот шаг, где я встал, а на тот, которого не было раньше.",
      goalRu: "увидеть, чем кончается план без полива",
      givenRu: ["пустой горшок", "мешок земли", "одно семечко", "лейка с водой", "подставка на свету"],
      doneWhenRu: "получится, когда я всё-таки донесу горшок до света",
      doneWhenFullRu:
        "Я иду по твоим шагам и останавливаюсь там, где шаг невозможен. Сухую землю на свет я не понесу — значит, где-то раньше не хватило полива.",
    },
    {
      id: "w2s2-p1",
      role: "practice",
      family: "sequence-world",
      worldId: "plant",
      tier: 1,
      promptRu: "Вставь недостающий шаг так, чтобы я дошёл до конца.",
      hintRu: "Полить можно, как только в горшке есть земля. Раньше — лить некуда.",
      goalRu: "добавить пропущенный шаг в план посадки",
      givenRu: ["пустой горшок", "мешок земли", "одно семечко", "лейка с водой", "подставка на свету"],
      doneWhenRu: "получится, когда я дойду до света и не застряну",
      doneWhenFullRu:
        "Каждый шаг возможен сразу после предыдущего, и последний — «поставить на свет».",
    },
    {
      id: "w2s2-p2",
      role: "practice",
      family: "sequence-world",
      worldId: "plant",
      tier: 1,
      promptRu: "Семечко одно. Скажи порядок, в котором оно точно окажется в ямке.",
      hintRu: "Ямку копают в земле, а не в пустом горшке. Что должно быть до ямки?",
      goalRu: "довести единственное семечко до закопанной ямки",
      givenRu: ["пустой горшок", "мешок земли", "одно семечко", "лейка с водой", "подставка на свету"],
      doneWhenRu: "получится, когда семечко будет закопано, а не лежать сверху",
      doneWhenFullRu:
        "Сначала земля, потом ямка, потом семечко, потом закопать. Класть семечко некуда, пока нет ямки.",
    },
    {
      id: "w2s2-p3",
      role: "practice",
      family: "sequence-world",
      worldId: "plant",
      tier: 2,
      promptRu: "Найди дыру в почти готовом плане и почини её одной вставкой.",
      hintRu: "Не переписывай всё. Найди один шаг, без которого следующий невозможен.",
      goalRu: "починить план одной вставкой",
      givenRu: ["пустой горшок", "мешок земли", "одно семечко", "лейка с водой", "подставка на свету"],
      doneWhenRu: "получится, когда план дойдёт до конца, а шагов станет ровно на один больше",
      doneWhenFullRu:
        "Достаточно одного недостающего шага. Если приходится переписывать весь план — дыра была не там, где ты подумал.",
    },
    {
      id: "w2s2-transfer",
      role: "transfer",
      family: "sequence-world",
      // Third world, and the one where the forgotten step costs the most: leave the keys
      // on the shelf and you find out on the wrong side of the door.
      worldId: "leaving",
      tier: 1,
      promptRu: "Подоконник закончился. Собери меня на улицу так, чтобы дверь осталась запертой.",
      hintRu: "Здесь тоже есть шаг, который вспоминают последним — и уже с той стороны двери.",
      goalRu: "выйти на улицу и запереть дверь",
      givenRu: ["куртка", "ботинки", "рюкзак", "ключи на полке", "закрытая дверь"],
      doneWhenRu: "получится, когда я окажусь на улице и дверь будет заперта",
      doneWhenFullRu:
        "Ключи лежат в прихожей. Если я не взял их до выхода, запереть дверь снаружи мне нечем.",
    },
  ],
};
