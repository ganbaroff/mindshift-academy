#!/usr/bin/env node
/**
 * Static release gate for the RU-only parent-facing Academy surface.
 * The checks intentionally read source so accidental copy regressions fail in CI.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...path) => readFileSync(join(root, ...path), "utf8");
const landing = read("src", "app", "page.tsx");
const consent = read("src", "app", "consent", "page.tsx");
const activation = read("src", "app", "activate", "page.tsx");
const dashboard = read("src", "app", "dashboard", "page.tsx");
const lesson = read("src", "app", "lesson", "[id]", "page.tsx");
const promptInput = read("src", "components", "chat", "PromptInput.tsx");
const header = read("src", "components", "layout", "Header.tsx");
const weeklyEmail = read("src", "emails", "weekly-report.tsx");
const rootLayout = read("src", "app", "layout.tsx");
const clerkRussianUi = read("src", "components", "auth", "ClerkRussianUi.tsx");
const signIn = read("src", "app", "sign-in", "[[...sign-in]]", "page.tsx");
const signUp = read("src", "app", "sign-up", "[[...sign-up]]", "page.tsx");
const petPressurePattern =
  /питомец[^.]{0,100}(?:скучает|жд[её]т|грустит|расстроен)|без чувства вины|чувств(?:о|овать) вины|(?:^|[^\p{L}])(?:ты|реб[её]нок)\s+(?:обязан(?:а)?|долж(?:ен|на))(?!\p{L})|(?:вернись|возвращайся)[^.]{0,60}(?:ради питомца|питомец)/iu;
const azerbaijaniLanguageTogglePattern = /(?:\bAZ\b|Azərbaycan dili|Азербайджанский)/iu;

let failed = 0;
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failed += 1;
}

function includesAll(source, values) {
  return values.every((value) => source.includes(value));
}

const publicScreens = [landing, consent, activation, dashboard, lesson, promptInput, header, signIn, signUp];

check(
  "public Academy screens do not expose an Azerbaijani language toggle",
  !publicScreens.some((source) => azerbaijaniLanguageTogglePattern.test(source)),
);
check(
  "Azerbaijani language-toggle guard recognizes representative labels without matching Azure",
  ["AZ", "Azərbaycan dili", "Азербайджанский"].every((label) =>
    azerbaijaniLanguageTogglePattern.test(label),
  ) && !azerbaijaniLanguageTogglePattern.test("Microsoft Azure OpenAI"),
);
check(
  "Clerk components and auth wrappers are Russian-only",
  rootLayout.includes("ruRU") &&
    rootLayout.includes("ClerkRussianUi") &&
    !/Sign In|Create Account|weekly proof|funnel/iu.test(`${signIn}\n${signUp}`) &&
    includesAll(signIn, ["Вход", "родительскую панель"]) &&
    includesAll(signUp, ["Создание аккаунта", "родительский аккаунт", "прогресс"]) &&
    includesAll(clerkRussianUi, [
      "Придумайте пароль",
      "Показать пароль",
      "Скрыть пароль",
      "Защищено с помощью",
      "Логотип Clerk",
    ]) &&
    clerkRussianUi.includes(
      'link.getAttribute("aria-label") !== "Логотип Clerk"',
    ),
);
check(
  "consent names every provider and limits data use to course functions",
  includesAll(consent, ["NVIDIA", "Google Gemini", "OpenAI", "только для функций курса"]),
);
check(
  "activation repeats the provider disclosure and course-only data purpose",
  includesAll(activation, ["NVIDIA", "Google Gemini", "OpenAI", "только для функций курса"]),
);
check(
  "consent notice announces asynchronous updates politely",
  consent.includes('role="status"') && consent.includes('aria-live="polite"'),
);
check(
  "consent groups independent checkboxes under a visible legend",
  consent.includes("<fieldset") && consent.includes("<legend") && (consent.match(/type="checkbox"/g) || []).length >= 2,
);
check(
  "consent labels the parent email and verification code inputs",
  consent.includes('name="parentEmail"') && consent.includes('name="verificationCode"'),
);
check(
  "dashboard offers progress review and Academy-data deletion, not stored child messages",
  dashboard.includes("прогресс") && dashboard.includes("удал") && !dashboard.includes("Лог промптов"),
);
check(
  "weekly parent email is neutral Russian without Azerbaijani or pet-pressure copy",
  !/Salam|Valideyn|скучает по|жд[её]т/iu.test(weeklyEmail),
);
check(
  "public Academy copy motivates without pet-pressure language",
  !petPressurePattern.test(publicScreens.join("\n")),
);
check(
  "pet-pressure guard recognizes representative coercive variants",
  [
    "Питомец ждёт возвращения к урокам.",
    "Ты обязан заниматься.",
    "Ты должна учиться.",
    "Ребёнок должен вернуться к питомцу.",
  ].every((example) => petPressurePattern.test(example)),
);
check(
  "user-facing proxy status is Russian",
  !/Safe(?: API)? Proxy/iu.test(`${lesson}\n${promptInput}`) && /Защита включена/iu.test(`${lesson}\n${promptInput}`),
);
check(
  "lesson explains IF/THEN as ЕСЛИ/ТО and does not claim model-weight calibration",
  includesAll(lesson, ["ЕСЛИ", "ТО"]) &&
    !/IF\/THEN/iu.test(lesson) &&
    !/калибровк[аи] вес[ао]в модел/iu.test(lesson),
);
check(
  "progress animation transitions only width",
  !header.includes("transition-all") && header.includes("transition-[width]"),
);

if (failed > 0) process.exit(1);
console.log("ALL RELEASE COPY ASSERTIONS PASSED");
