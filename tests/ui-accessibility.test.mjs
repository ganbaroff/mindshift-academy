#!/usr/bin/env node
/** Focused regressions from the Academy UI accessibility review. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const landing = readFileSync(join(root, "src/app/page.tsx"), "utf8");
const onboarding = readFileSync(join(root, "src/app/onboarding/page.tsx"), "utf8");
const promptInput = readFileSync(join(root, "src/components/chat/PromptInput.tsx"), "utf8");
const showcase = readFileSync(join(root, "src/components/showcase/InteractiveShowcase.tsx"), "utf8");
const signIn = readFileSync(join(root, "src/app/sign-in/[[...sign-in]]/page.tsx"), "utf8");
const signUp = readFileSync(join(root, "src/app/sign-up/[[...sign-up]]/page.tsx"), "utf8");
let failed = 0;
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failed += 1;
}

check(
  "onboarding does not make a non-semantic container keyboard-inaccessible",
  !onboarding.includes("onClick={!isHatched ? skipHatch : undefined}"),
  "use the explicit Skip button rather than an unkeyboardable clickable div"
);
check(
  "pet-name input identifies its form purpose and has a visible keyboard focus state",
  onboarding.includes('name="petName"') &&
    onboarding.includes('autoComplete="off"') &&
    onboarding.includes("focus-visible:ring-2"),
  "name/autocomplete/focus-visible are required"
);
check(
  "lesson prompt identifies its form purpose and has a visible keyboard focus state",
  promptInput.includes('name="lessonPrompt"') &&
    promptInput.includes('autoComplete="off"') &&
    promptInput.includes("focus-visible:ring-2"),
  "name/autocomplete/focus-visible are required"
);
check(
  "chat action controls avoid transition-all and expose keyboard focus",
  !promptInput.includes("transition-all") &&
    (promptInput.match(/focus-visible:ring-2/g) || []).length >= 3,
  "buttons need explicit transition properties and focus-visible rings"
);
check(
  "landing makes the parent start and child-code routes visible as distinct first-screen actions",
  landing.includes('href="/sign-up"') &&
    landing.includes("Я взрослый — начать") &&
    landing.includes('href="/enter-code"') &&
    landing.includes("У ребёнка уже есть код"),
  "the parent path cannot be hidden in a quiet header link"
);
check(
  "parent sign-in and registration continue to the consent gate",
  signIn.includes('forceRedirectUrl="/consent"') && signUp.includes('forceRedirectUrl="/consent"'),
  "a successful Clerk action must have one clear next step"
);
check(
  "landing preview does not bypass the protected parent-consent route",
  !showcase.includes("/onboarding?") &&
    showcase.includes('window.location.assign("/enter-code")') &&
    !showcase.includes("transition-all") &&
    showcase.includes("focus-visible:ring-2"),
  "preview may lead to code entry, never straight to onboarding"
);

if (failed > 0) process.exit(1);
console.log("ALL UI ACCESSIBILITY ASSERTIONS PASSED");
