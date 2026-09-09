#!/usr/bin/env node
/**
 * Child-comprehension contract for the three onboarding phases.
 * This is intentionally source-level: it protects the words and landmarks a
 * child encounters before the first interactive session.
 */
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/app/onboarding/page.tsx", import.meta.url),
  "utf8"
);

let failed = 0;
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failed += 1;
}

check(
  "each onboarding phase names its current step with an accessible heading",
  (source.match(/<h1/g) || []).length >= 3 &&
    source.includes("Шаг 1 из 3") &&
    source.includes("Шаг 2 из 3") &&
    source.includes("Шаг 3 из 3")
);

check(
  "the hatching status announces progress without relying on motion",
  source.includes('role="status"') && source.includes('aria-live="polite"')
);

check(
  "each phase exposes one clear visible next action",
  source.includes("Познакомиться!") &&
    source.includes("Это ${petName}!") &&
    source.includes("Начать сессию 1")
);

// Week 1 session 1 is family `grid-draw` (src/content/curriculum/week-1/session-1.ts:29):
// the child paints cells and presses «Проверить» (GridDrawSurface.tsx toggles cells on
// click). The promise made here must match THAT, which is why this assertion no longer
// looks for the old "скажешь питомцу команду" wording — the screen was telling the truth
// and this test was the stale half.
check(
  "ready phase explains the first-session outcome with a non-answer-revealing example",
  source.includes("Что сделаешь") &&
    source.includes("Что получится") &&
    source.includes("Выберешь на поле клетки, которые нужно закрасить") &&
    source.includes("Питомец закрасит только выбранные клетки")
);

// A worked promise must not double as a spoiler: the goals of the first session's own
// tasks may never appear on the onboarding screen.
check(
  "the ready-phase example does not leak the first session's answers",
  ["Верхняя полоса окон", "Горит один столбец окон", "Горит нижний ряд окон"].every(
    (goal) => !source.includes(goal)
  )
);

// `/continue` resolves the child's real position. Hardcoding w1-s1 here is defect 2 —
// the returning child restarted at step 1 (src/lib/tasks/course-map.ts:6). So this now
// forbids BOTH the legacy lesson route and the hardcoded first session, instead of
// demanding the very string the product deliberately removed.
check(
  "the only ready-phase route resolves the child's position instead of hardcoding step 1",
  source.includes('router.push("/continue")') &&
    !source.includes('router.push("/lesson/1")') &&
    !source.includes('router.push("/session/w1-s1")')
);

if (failed) process.exit(1);
console.log("ALL ONBOARDING COMPREHENSION ASSERTIONS PASSED");
