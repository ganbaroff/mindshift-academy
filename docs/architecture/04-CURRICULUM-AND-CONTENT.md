# MindShift: Curriculum & Content Architecture

The curriculum is designed around Prompt Engineering, gamified as "casting spells" or "taming a monster".

## The 5-Lesson Core Loop
Implemented in `src/lib/curriculum.ts`.

### Lesson 1: Birth (Give it a voice)
- **Concept:** Basic prompting / System Instructions.
- **Task:** The child must write a prompt commanding the monster to speak in a specific tone (e.g., "Speak like a pirate").
- **Verification:** AI checks if the response matches the requested persona.

### Lesson 2: Secret Language (Encryption)
- **Concept:** Transformations and formatting.
- **Task:** Child must prompt the AI to reverse a string or translate it into emojis.
- **Verification:** Strict output parsing to ensure the AI obeyed the constraint.

### Lesson 3: Give it Eyes (Vision)
- **Concept:** Image Generation prompting.
- **Task:** Describe a habitat for the monster using at least 3 adjectives.
- **Verification:** Calls `gpt-image-2` and returns the generated habitat.

### Lesson 4: Teach it to Think (Logic)
- **Concept:** Few-shot prompting / IF-ELSE logic.
- **Task:** Give the monster a rule: "If I say FIRE, you say WATER."
- **Verification:** The system tests the rule with a simulated input.

### Lesson 5: The Master Card (Final Boss)
- **Concept:** Comprehensive synthesis.
- **Task:** Combine persona, logic, and vision to finalize the Monster's ultimate form.
- **Reward:** Unlocks the "Master Badge" and full sandbox mode.
