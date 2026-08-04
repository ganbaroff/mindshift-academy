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

check(
  "ready phase explains the first-session outcome with a non-answer-revealing example",
  source.includes("Что сделаешь") &&
    source.includes("Что получится") &&
    source.includes("Скажешь питомцу короткую и точную команду") &&
    source.includes("Он закрасит только те клетки, которые назвала команда")
);

check(
  "the only ready-phase route remains the first thinking session",
  source.includes('router.push("/session/w1-s1")') && !source.includes('router.push("/lesson/1")')
);

if (failed) process.exit(1);
console.log("ALL ONBOARDING COMPREHENSION ASSERTIONS PASSED");
