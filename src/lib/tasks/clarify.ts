/**
 * The re-ask: the monster asks one question instead of failing the child.
 *
 * Contract: `docs/architecture/08-UX-MONSTER-JOURNEY.md` §3, amended by §10.1.
 *
 * Deterministic code, never a model call — it must be free, instant, identical every
 * time and testable. A re-ask is NOT an attempt: nothing is recorded, no crystal moves,
 * no failure counter advances. At most `MAX_REASKS_PER_TASK`, then the hint is free.
 *
 * Design bias: a false positive (nagging a child who was clear) costs more than a miss
 * (letting a vague answer through to normal feedback). Every rule below is written to
 * fire only on evidence, never on suspicion.
 *
 * The monster never authors its own text — this returns a code plus the child's own
 * words, and the copy is rendered locally, exactly as `unclear-copy.ts` does for
 * interpreter refusals.
 */

import type { TaskFamilyId } from "./types";

export const MAX_REASKS_PER_TASK = 2;

export type ClarifyCode =
  | "verb_without_object"
  | "object_without_verb"
  | "order_unspecified"
  | "dangling_pronoun"
  | "too_few_words";

export type ClarifyStage =
  /** First re-ask: quote the child and ask the one missing thing. */
  | "ask"
  /** Second re-ask: say what I would do and ask them to confirm (§3). */
  | "confirm";

export type ClarifyQuestion = {
  code: ClarifyCode;
  /** The child's own words that triggered it — quoted back, never paraphrased. */
  quote: string;
  stage: ClarifyStage;
};

export type ClarifyInput = {
  utterance: string;
  family: TaskFamilyId;
  /** What the task says the child has to work with — the object vocabulary. */
  given?: readonly string[];
  /** Re-asks already spent on this task. */
  reasksUsed: number;
};

/**
 * Action stems, matched by prefix so Russian inflection does not need a stemmer.
 * Curated, not generated: an over-broad list turns the re-ask into a nag.
 */
const ACTION_STEMS = [
  "намаж", "намаз", "полож", "клад", "возьм", "взя", "бер",
  "закрас", "крас", "отрез", "режь", "накр", "постав", "став",
  "добав", "убер", "убир", "откр", "закр", "нарис", "соедин",
  "сдела", "дела", "нача", "подай", "пода", "выбер", "выбир",
  "повтор", "продолж", "поверн", "иди", "ид", "шагн", "стоп",
] as const;

/** Pronouns that need something to point at. */
const DANGLING_PRONOUNS = [
  "его", "её", "ее", "их", "это", "этот", "эту", "этим", "том",
  "туда", "там", "тот", "та", "те", "ним", "ней",
] as const;

/** Words that carry no instruction on their own. */
const FILLER = [
  "ну", "вот", "типа", "короче", "как", "то", "так", "просто", "давай",
  "эм", "ээ", "ага", "угу", "да", "нет", "не", "знаю", "хз", "ой",
  "пожалуйста", "монстр", "монстрик", "привет",
] as const;

/** Explicit ordering markers — their presence proves the child ordered on purpose. */
const ORDER_WORDS = [
  "сначала", "сперва", "потом", "затем", "после", "дальше", "далее",
  "первым", "первый", "вторым", "второй", "третьим", "третий",
  "четвёртым", "четвертым", "наконец", "конце", "начале", "перед",
] as const;

/** Phrases where the child says order does not matter — on a task that grades order. */
const ANY_ORDER_PHRASES = [
  "в любом порядке", "любом порядке", "неважно порядок", "не важно порядок",
  "порядок неважен", "как угодно", "без разницы", "всё равно как",
] as const;

/** Families whose verdict depends on the order of what the child said. */
const ORDER_GRADED: ReadonlySet<TaskFamilyId> = new Set<TaskFamilyId>([
  "sequence-world",
  "pattern-expand",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е").trim();
}

function words(text: string): string[] {
  return normalize(text)
    .split(/[^a-zа-я0-9]+/i)
    .filter(Boolean);
}

/** Content-driven object vocabulary: stems of what the task says is given. */
function givenStems(given: readonly string[] | undefined): string[] {
  if (!given?.length) return [];
  const stems: string[] = [];
  for (const entry of given) {
    for (const word of words(entry)) {
      if (word.length < 3) continue;
      // Drop the inflected tail so «хлеб» matches «хлебом», «масло» matches «маслом».
      stems.push(word.length > 5 ? word.slice(0, word.length - 2) : word.slice(0, 3));
    }
  }
  return stems;
}

function startsWithAny(word: string, stems: readonly string[]): boolean {
  return stems.some((stem) => word.startsWith(stem));
}

function countActions(tokens: string[]): number {
  return tokens.filter((w) => startsWithAny(w, ACTION_STEMS)).length;
}

function hasObject(tokens: string[], stems: string[]): boolean {
  if (!stems.length) return false;
  return tokens.some((w) => startsWithAny(w, stems));
}

/**
 * Decide whether the monster should ask instead of grading.
 * Returns null when the answer is clear enough to check — the common case.
 */
export function clarify(input: ClarifyInput): ClarifyQuestion | null {
  if (input.reasksUsed >= MAX_REASKS_PER_TASK) return null;

  const raw = input.utterance.trim();
  if (!raw) return null; // Empty is not a re-ask — the check button is disabled.

  const text = normalize(raw);
  const tokens = words(raw);
  const stems = givenStems(input.given);
  const meaningful = tokens.filter(
    (w) => !(FILLER as readonly string[]).includes(w) && w.length > 1
  );
  const stage: ClarifyStage = input.reasksUsed === 0 ? "ask" : "confirm";
  const actions = countActions(tokens);
  const objectPresent = hasObject(tokens, stems);

  // Rules are ordered most-specific first: the question a child can act on beats the
  // question that is merely true. «положи его» is a pronoun problem, not a verb problem.

  // 1. A pronoun with nothing before it to point at — «положи его».
  const pronounIndex = tokens.findIndex((w) =>
    (DANGLING_PRONOUNS as readonly string[]).includes(w)
  );
  if (pronounIndex >= 0 && stems.length > 0) {
    const before = tokens.slice(0, pronounIndex);
    if (!hasObject(before, stems)) {
      return { code: "dangling_pronoun", quote: tokens[pronounIndex], stage };
    }
  }

  // 2. A verb with nothing to do it to — «намажь».
  //    Two guards against nagging: the task must have declared what is given (so an
  //    absent object is evidence, not ignorance), and the utterance must be short.
  //    A child who wrote five words has said something; we grade it and answer in
  //    feedback rather than interrogating them.
  if (actions >= 1 && stems.length > 0 && !objectPresent && meaningful.length <= 3) {
    const verb = tokens.find((w) => startsWithAny(w, ACTION_STEMS));
    return { code: "verb_without_object", quote: verb ?? raw, stage };
  }

  // 3. Things but no doing — «хлеб и сыр».
  if (actions === 0 && objectPresent) {
    return { code: "object_without_verb", quote: raw, stage };
  }

  // 4. Only filler, and no action anywhere. Nothing to execute and nothing to grade.
  if (actions === 0 && meaningful.length < 2) {
    return { code: "too_few_words", quote: raw, stage };
  }

  // 5. Order is graded here, and the child either said it does not matter or joined
  //    every action with «и» — which leaves the sequence genuinely undecided.
  //    A comma-separated or numbered list is already an order: never re-asked.
  if (ORDER_GRADED.has(input.family) && actions >= 2) {
    const saidAnyOrder = ANY_ORDER_PHRASES.some((p) => text.includes(p));
    const hasOrderWord = tokens.some((w) =>
      startsWithAny(w, ORDER_WORDS as readonly string[])
    );
    const listPunctuation = /[,;\n]|\d\s*[).]/.test(raw);
    if (saidAnyOrder || (!hasOrderWord && !listPunctuation)) {
      return { code: "order_unspecified", quote: raw, stage };
    }
  }

  return null;
}

/**
 * The monster's voice. First person, curious, never corrective — §10.1: the difference
 * from a failure is carried by register, not colour, so nothing here may read as a verdict.
 */
export function clarifyMessage(question: ClarifyQuestion): string {
  const quote = `«${question.quote.trim()}»`;

  if (question.stage === "confirm") {
    switch (question.code) {
      case "verb_without_object":
        return `Ты сказал ${quote}. Я возьму то, что лежит на столе, и сделаю это с ним — так?`;
      case "object_without_verb":
        return `Ты назвал ${quote}. Я возьму это в руки и буду ждать следующего шага — так?`;
      case "order_unspecified":
        return `Я сделаю шаги ровно в том порядке, в каком ты их сказал: ${quote}. Так?`;
      case "dangling_pronoun":
        return `Под ${quote} я пойму то, что назвал последним. Так?`;
      case "too_few_words":
        return `Я услышал только ${quote}. Скажи ещё одно слово — что с этим сделать?`;
    }
  }

  switch (question.code) {
    case "verb_without_object":
      return `Ты сказал ${quote} — а чем? И на что?`;
    case "object_without_verb":
      return `Ты назвал ${quote}, но не сказал, что с этим сделать.`;
    case "order_unspecified":
      return `Я делаю шаги строго по очереди. Какой из них первый?`;
    case "dangling_pronoun":
      return `Ты сказал ${quote} — а что это? Назови словом.`;
    case "too_few_words":
      return `Я услышал ${quote} — этого мне мало, чтобы начать.`;
  }
}

/** Shown under the question so a child can see it is not a mark against them. */
export const CLARIFY_HELPER_RU = "Это не ошибка — я просто уточняю.";
