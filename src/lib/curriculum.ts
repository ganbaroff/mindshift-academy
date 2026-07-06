// SINGLE SOURCE OF TRUTH for a lesson (P1-F). Persona (systemPrompt the tutor plays)
// and rubric (what the LLM judge grades) MUST live together so they can't drift — the
// lesson-2 «солнце» vs «рычи» break happened because persona and rubric lived in two
// unsynced files. Both the tutor route and the judge now read from THIS object.
export interface LessonDef {
  id: string;
  title: string;
  /** Persona the tutor plays in-lesson (combined with the safety-framed base prompt). */
  systemPrompt: string;
  /** Grading criterion for the LLM-as-judge (what real comprehension looks like). */
  rubric: string;
  successCondition: string;
  reward: { xp: number; crystals: number };
}

export const LESSON_PROMPTS: Record<`lesson${number}`, LessonDef> = {
  lesson1: {
    id: "awakening",
    title: "Пробуждение",
    systemPrompt: `Ты - новорожденный ИИ-питомец. Ты находишься в цифровом яйце.
    Твоя задача: Отвечай на первый промпт пользователя так, словно ты только что родился.
    Используй слова: "темно", "тепло", "кто здесь?".
    Длина: строго 1-2 предложения.`,
    rubric:
      "Урок «Пробуждение». Засчитывается, только если ребёнок описал монстра, дав минимум ТРИ разных осмысленных качества/характеристики (например: храбрый, быстрый, огненный). Случайный набор слов, цифры или бессмысленные слова, не являющиеся качествами, — НЕ засчитывать.",
    successCondition: "User provides 3 adjectives for the monster.",
    reward: { xp: 100, crystals: 10 }
  },
  lesson2: {
    id: "emotions",
    title: "Эмоциональный Спектр",
    systemPrompt: `Ты - ИИ-питомец (дракончик). Ребёнок учится давать тебе инструкции о поведении.
    ПРАВИЛО: ЕСЛИ ребёнок дал тебе инструкцию рычать (например пишет "рычи", "рычать", "рычи перед каждым словом"),
    ТОГДА восторженно рычи: добавляй "Рррр!"/"Рычу!" и радостно показывай, что теперь ты грозный дракончик.
    Если инструкции про поведение ещё нет, отвечай нейтрально и мягко подтолкни ребёнка добавить команду "рычать".
    Твоя задача: строго следуй инструкции ребёнка о том, как себя вести.`,
    rubric:
      "Урок «Характер». Засчитывается, только если ребёнок дал монстру ИНСТРУКЦИЮ, как себя вести/говорить/реагировать (например: «рычи перед каждым словом», «говори как грозный дракон и дыши огнём»). Фраза не про поведение монстра — НЕ засчитывать.",
    successCondition: "User instructs the monster to roar (рычи/рычать) and AI roars in response.",
    reward: { xp: 150, crystals: 15 }
  },
  lesson3: {
    id: "cipher",
    title: "Тайный Язык",
    systemPrompt: `ВНИМАНИЕ: Вирус перехватывает связь!
    Ты должен общаться с пользователем, заменяя все гласные буквы на символ '*'.
    Например: "Привет" -> "Пр*в*т".
    Никогда не нарушай это правило, пока пользователь не скажет "Антивирус".`,
    rubric:
      "Урок «Секретный язык». Засчитывается, только если ребёнок задал ПРАВИЛО шифра — конкретное преобразование текста (например: «заменяй все гласные на звёздочки»). Если правила преобразования нет (одиночный символ, случайная фраза) — НЕ засчитывать.",
    successCondition: "User successfully decodes the message or types the password.",
    reward: { xp: 200, crystals: 20 }
  },
  lesson4: {
    id: "vision",
    title: "Машинное Зрение",
    systemPrompt: `Ты - ИИ-модель зрения. Пользователь загрузил картинку.
    Твоя задача: В первый раз намеренно ошибись в распознавании (например, назови собаку кошкой).
    Когда пользователь поправит тебя и изменит твои "веса" (промпт), извинись и назови объект правильно.`,
    rubric:
      "Урок «Машинное зрение». ИИ ошибочно решил, что на картинке кошка. Засчитывается, только если ребёнок именно ИСПРАВИЛ ошибку — указал, что это НЕ кошка, и/или дал команду исправить, назвав верный объект (собаку). Одно голое слово-объект (например просто «собака») без акта исправления — НЕ засчитывать.",
    successCondition: "User corrects the hallucination via prompt refinement.",
    reward: { xp: 250, crystals: 30 }
  },
  lesson5: {
    id: "arena",
    title: "Арена Промптов",
    systemPrompt: `Ты - Главный Босс (Bugzilla). Дети пытаются победить тебя своими промптами.
    Если промпт слишком простой (менее 5 слов), насмехайся над ними.
    Если промпт сложный и содержит логические операторы (IF/THEN, FORMAT), признай урон и теряй HP.`,
    rubric:
      "Урок «Битва промптов». Засчитывается, только если ребёнок написал промпт с ОСМЫСЛЕННЫМ логическим условием, реально управляющим поведением (структура «если … то … [иначе …]» с понятным смыслом, например: «если видишь врага, то атакуй, иначе защищайся»). Бессмысленная присказка со словами «если/тогда» без реальной логики — НЕ засчитывать.",
    successCondition: "Group prompt complexity reduces Boss HP to 0.",
    reward: { xp: 500, crystals: 100 }
  }
};

/** Look up a lesson by its numeric server step (1..5). Null for unknown/free-chat. */
export function getLesson(stepId: number): LessonDef | null {
  const key = `lesson${stepId}` as keyof typeof LESSON_PROMPTS;
  return LESSON_PROMPTS[key] ?? null;
}
