# MindShift: Curriculum & Content Architecture

The curriculum is designed around Prompt Engineering, gamified as "casting spells" or "taming a monster".

## The 5-Lesson Core Loop
Implemented in `src/lib/curriculum.ts`.

### Lesson 1: Awakening (Пробуждение)
- **Concept:** Describe a character with precise qualities.
- **Task:** Give the egg-bound monster three meaningful qualities, such as «храбрый, быстрый, весёлый».
- **Verification:** The lesson judge accepts three real qualities; random words and numbers do not earn a reward.

### Lesson 2: Emotional Spectrum (Эмоциональный спектр)
- **Concept:** Give an AI a clear instruction about speaking style.
- **Task:** Ask the dragon to sing, speak enthusiastically, rhyme, or add a fire emoji.
- **Verification:** The judge checks that the child instructed the dragon's style, not merely used a keyword.

### Lesson 3: Secret Code (Секретный код)
- **Concept:** Define a text-transformation rule.
- **Task:** Tell the pet how to encode text, for example by replacing vowels with `*`.
- **Verification:** The reply must visibly demonstrate the requested cipher; a generic reply falls back to a safe lesson-specific example.

### Lesson 4: Machine Vision (Машинное зрение)
- **Concept:** Correct an AI recognition error with a clearer prompt.
- **Task:** Tell the model that it mistook a dog for a cat and ask it to correct itself.
- **Verification:** The judge requires an actual correction, not a single object word.

### Lesson 5: Final Quest (Финальный квест)
- **Concept:** Express an executable condition with ЕСЛИ/ТО/ИНАЧЕ.
- **Task:** Guide the dragon through a maze using a meaningful conditional rule.
- **Verification:** The judge checks for real condition-and-action logic before awarding the final reward.

## Provider and Safety Boundaries

Azure GPT provides the tutor and lesson judge. NVIDIA Llama Guard and Gemini independently
classify both child input and tutor output. A classifier error blocks the message (fail-closed);
the tutor model is never the sole safety decision-maker.
