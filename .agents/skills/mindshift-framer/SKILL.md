---
name: mindshift-framer
description: Animation and UI/UX guidelines using Framer Motion for kids.
---

# Framer Motion Guidelines for MindShift

1. **Dopamine Loops:** Every action a kid takes must have visual feedback.
2. **Monster Card:** 
   - `whileHover={{ scale: 1.05 }}`
   - `whileTap={{ scale: 0.95 }}`
3. **Crystal Rewards:** When earning crystals, use a staggered spring animation so they "pop" into the screen.
   - `transition={{ type: "spring", stiffness: 300, damping: 20 }}`
4. **No Boring Loading:** Use Lottie or Framer Motion pulsing for any async API wait time (e.g., waiting for GPT-4o-mini).
5. **Color Palette Enforcement:** Stick to `#090d16` (bg), `#8b5cf6` (primary), `#f59e0b` (dopamine/crystals).
