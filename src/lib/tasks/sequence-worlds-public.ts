/**
 * The half of a sequence world a child is allowed to see: the scene, the vocabulary, and
 * what each action is called.
 *
 * Split from `sequence-world.ts` on purpose. The requirements and effects ARE the answer
 * key — read them and the only valid order falls out — so they stay on the server. This
 * module is the one the browser bundle imports.
 *
 * Invariant, asserted in `tests/tasks.test.mjs`: **`actions` is itself a valid solution.**
 * It gives every world a canonical order for tests and content to rely on. The UI
 * deliberately does NOT render them in this order — see `displayOrder` — or the task would
 * be "press the buttons top to bottom", which is not thinking.
 */

export type PublicSequenceWorld = {
  id: string;
  sceneRu: string;
  actions: readonly string[];
  labelsRu: Record<string, string>;
};

export const PUBLIC_SEQUENCE_WORLDS: Record<string, PublicSequenceWorld> = {
  sandwich: {
    id: "sandwich",
    sceneRu: "Монстр стоит у стола. На столе: два ломтика хлеба, масло, сыр, нож, тарелка.",
    actions: ["взять_нож", "положить_хлеб", "намазать_масло", "положить_сыр", "накрыть_хлебом", "подать"],
    labelsRu: {
      взять_нож: "Взять нож",
      положить_хлеб: "Положить хлеб",
      намазать_масло: "Намазать масло",
      положить_сыр: "Положить сыр",
      накрыть_хлебом: "Накрыть хлебом",
      подать: "Подать",
    },
  },
  plant: {
    id: "plant",
    sceneRu:
      "Монстр стоит на подоконнике. Рядом: пустой горшок, мешок земли, одно семечко, лейка с водой и подставка на свету.",
    actions: [
      "взять_горшок",
      "насыпать_землю",
      "выкопать_ямку",
      "положить_семечко",
      "закопать",
      "полить",
      "поставить_на_свет",
    ],
    labelsRu: {
      взять_горшок: "Взять горшок",
      насыпать_землю: "Насыпать землю",
      выкопать_ямку: "Выкопать ямку",
      положить_семечко: "Положить семечко",
      закопать: "Закопать",
      полить: "Полить",
      поставить_на_свет: "Поставить на свет",
    },
  },
  leaving: {
    id: "leaving",
    sceneRu:
      "Монстр дома, собирается на улицу. В прихожей: куртка, ботинки, рюкзак, ключи на полке и закрытая дверь.",
    actions: [
      "надеть_ботинки",
      "надеть_куртку",
      "взять_рюкзак",
      "взять_ключи",
      "открыть_дверь",
      "выйти",
      "закрыть_дверь",
    ],
    labelsRu: {
      надеть_ботинки: "Надеть ботинки",
      надеть_куртку: "Надеть куртку",
      взять_рюкзак: "Взять рюкзак",
      взять_ключи: "Взять ключи",
      открыть_дверь: "Открыть дверь",
      выйти: "Выйти",
      закрыть_дверь: "Закрыть дверь",
    },
  },
};

export function publicSequenceWorld(id?: string | null): PublicSequenceWorld {
  return (id && PUBLIC_SEQUENCE_WORLDS[id]) || PUBLIC_SEQUENCE_WORLDS.sandwich;
}

/**
 * What the child sees, and it is never the answer. Sorted by the Russian label, so the
 * buttons carry no hint about order — the previous surface listed them in solution order,
 * which turned a decomposition task into a top-to-bottom click.
 */
export function displayOrder(world: PublicSequenceWorld): string[] {
  return [...world.actions].sort((a, b) =>
    (world.labelsRu[a] ?? a).localeCompare(world.labelsRu[b] ?? b, "ru")
  );
}
