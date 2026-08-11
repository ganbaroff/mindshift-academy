import type { SessionContent } from "../types";

/**
 * Week 2 · session 1 — order changes the result.
 *
 * The sandwich stays here and only here. It earns the first session because it is the one
 * procedure an eight-year-old has watched an adult perform a hundred times, so nothing in
 * the task is new except the thinking. It used to be the whole week — all fifteen tasks,
 * three sessions — because the engine could not hold a second world.
 *
 * The transfer task deliberately leaves the kitchen. A "transfer" that stays in the world
 * it just practised is a fifth practice task wearing a different name.
 */
export const week2Session1: SessionContent = {
  id: "w2-s1",
  week: 2,
  session: 1,
  concept: "decomposition",
  misconception: "шаги можно перечислить в любом порядке, и так понятно",
  titleRu: "Сначала — потом",
  explanationRu:
    "Порядок шагов меняет результат. Если сказать «намазать масло» раньше «взять нож», монстр остановится с пустой рукой — он делает шаги строго по списку и не догадывается.",
  dinnerQuestionRu:
    "Попроси ребёнка рассказать утренний распорядок так, чтобы робот не перепутал порядок. Где шаги можно было сказать в любом порядке — и почему так нельзя?",
  practiceRequired: 3,
  minTier: 1,
  tasks: [
    {
      id: "w2s1-collision",
      role: "collision",
      family: "sequence-world",
      worldId: "sandwich",
      tier: 1,
      // Old text: «Скажи шаги для сэндвича в любом порядке» — the exact prompt that
      // started 08-UX-MONSTER-JOURNEY: «для сэндвича» could mean make or assemble, and
      // «в любом порядке» contradicted a task that grades order. Rewritten per §2.
      promptRu: "Собери сэндвич из того, что лежит на столе.",
      hintRu: "Что должно случиться РАНЬШЕ, чтобы получилось потом?",
      goalRu: "собрать сэндвич из того, что лежит на столе",
      givenRu: ["хлеб — два ломтика", "масло", "сыр", "нож"],
      doneWhenRu: "получится, когда я дойду до «подать» и не застряну",
      doneWhenFullRu:
        "Я делаю твои шаги подряд, ровно в том порядке, в котором услышал. Если шаг невозможен — я останавливаюсь на нём и говорю, на каком.",
    },
    {
      id: "w2s1-p1",
      role: "practice",
      family: "sequence-world",
      worldId: "sandwich",
      tier: 1,
      promptRu: "Скажи порядок так, чтобы я взял нож не раньше и не позже, чем нужно.",
      hintRu: "Нож нужен для масла. Значит, он должен быть в руке до масла — но не обязательно самым первым.",
      goalRu: "поставить «взять нож» на верное место в порядке",
      givenRu: ["хлеб — два ломтика", "масло", "сыр", "нож"],
      doneWhenRu: "получится, когда до масла нож уже будет в руке",
      doneWhenFullRu:
        "К шагу «намазать масло» нож уже у меня в руке. Рукой масло я не мажу и остановлюсь.",
    },
    {
      id: "w2s1-p2",
      role: "practice",
      family: "sequence-world",
      worldId: "sandwich",
      tier: 1,
      promptRu: "Хлеба всего два ломтика. Скажи порядок, в котором обоим найдётся место.",
      hintRu: "Один ломтик — низ, второй — крышка. Что должно оказаться между ними до того, как накроешь?",
      goalRu: "уложиться в два ломтика хлеба",
      givenRu: ["хлеб — два ломтика", "масло", "сыр", "нож"],
      doneWhenRu: "получится, когда сыр окажется внутри, а не сверху",
      doneWhenFullRu:
        "Накрыть я могу только один раз, и после этого внутрь не добраться. Значит, сыр ложится до того, как я накрою.",
    },
    {
      id: "w2s1-p3",
      role: "practice",
      family: "sequence-world",
      worldId: "sandwich",
      tier: 2,
      promptRu: "Скажи весь план целиком: от первого шага до подачи.",
      hintRu: "Проверь про себя: каждый следующий шаг возможен сразу после предыдущего?",
      goalRu: "назвать полный план от первого шага до подачи",
      givenRu: ["хлеб — два ломтика", "масло", "сыр", "нож", "тарелка"],
      doneWhenRu: "получится, когда я пройду весь план и подам",
      doneWhenFullRu:
        "В плане нет ни одного шага, который я не смогу сделать, и последний шаг — подача.",
    },
    {
      id: "w2s1-transfer",
      role: "transfer",
      family: "sequence-world",
      // Different world on purpose: the skill is order, not sandwiches. If a child can only
      // do this at the kitchen table, they learned the sandwich and not the idea.
      worldId: "plant",
      tier: 1,
      promptRu: "Стол закончился — теперь подоконник. Посади семечко, чтобы оно росло.",
      hintRu: "То же правило, что и с сэндвичем: спроси себя, что должно быть готово РАНЬШЕ.",
      goalRu: "посадить семечко и оставить горшок на свету",
      givenRu: ["пустой горшок", "мешок земли", "одно семечко", "лейка с водой", "подставка на свету"],
      doneWhenRu: "получится, когда горшок окажется на свету, а семечко — в мокрой земле",
      doneWhenFullRu:
        "Семечко закопано, земля полита, горшок стоит на свету. Сухую землю на свет я не понесу — семечко там засохнет.",
    },
  ],
};
