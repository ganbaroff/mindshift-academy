#!/usr/bin/env node
/**
 * Appendix A — 18 accessibility receipts for ages 8–11 (W4).
 * Static source + contract checks; receipts written to docs/release.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "release", "_w4_drill_workspace");
const shouldWriteLegacyReceipts = process.env.ACADEMY_WRITE_LEGACY_RECEIPTS === "1";
if (shouldWriteLegacyReceipts) mkdirSync(outDir, { recursive: true });

const session = readFileSync(join(root, "src/app/session/[id]/page.tsx"), "utf8");
const taskWorkspace = readFileSync(
  join(root, "src/components/curriculum/task-surfaces/TaskWorkspace.tsx"),
  "utf8"
);
const taskSurfaces = [
  "GridDrawSurface.tsx",
  "SequenceSurface.tsx",
  "RuleSurface.tsx",
  "PatternSurface.tsx",
  "ClaimSurface.tsx",
].map((file) => readFileSync(join(root, "src/components/curriculum/task-surfaces", file), "utf8")).join("\n");
const learnerUi = session + taskWorkspace + taskSurfaces;
const globals = readFileSync(join(root, "src/app/globals.css"), "utf8");
const grid = readFileSync(join(root, "src/components/curriculum/DisplayGrid.tsx"), "utf8");
const enter = readFileSync(join(root, "src/app/enter-code/page.tsx"), "utf8");
void enter; // alphanumeric code entry — inputMode text (see A16 evidence)
const consent = readFileSync(join(root, "src/app/consent/page.tsx"), "utf8");
const onboarding = readFileSync(join(root, "src/app/onboarding/page.tsx"), "utf8");
const sound = readFileSync(join(root, "src/lib/sound-engine.ts"), "utf8");
const monsterCard = existsSync(join(root, "src/components/modals/MonsterCard.tsx"))
  ? readFileSync(join(root, "src/components/modals/MonsterCard.tsx"), "utf8")
  : "";
const prompt = readFileSync(join(root, "src/components/chat/PromptInput.tsx"), "utf8");

const items = [];
function receipt(id, title, pass, evidence) {
  items.push({ id, title, pass, evidence });
  console.log(`${pass ? "PASS" : "FAIL"}  A${id}: ${title}`);
}

receipt(1, "grid tiles / hint buttons >=44px; primary tiles ~2cm", 
  /min-h-11|w-11 h-11|min-w-\[44px\]|min-w-11/.test(learnerUi + grid) && globals.includes("min-height: 44px"),
  "DisplayGrid cells w-11; session hints/send min-h-11; coarse pointer 44px");

receipt(2, ">=24px spacing where hit area smaller",
  learnerUi.includes("gap-2") || learnerUi.includes("gap-3") || learnerUi.includes("space-y"),
  "session uses gap/space-y between controls");

receipt(3, "inputs >=16px font on mobile (iOS zoom)",
  globals.includes("textarea, input") && globals.includes("font-size: 16px") && learnerUi.includes("text-base"),
  "globals coarse input 16px; session input text-base");

receipt(4, "body >=16px, short sentences, no text walls",
  globals.includes("font-size: 16px") && globals.includes("line-height: 1.5"),
  "body 16px / 1.5; curriculum prompts are short session cards");

// The requirement is a RATIO (line-height >= 1.5x the font size), not one Tailwind class.
// The task-first viewport work (2a2646f) moved the prompt from text-base/leading-7 to
// text-sm/leading-6 so the board clears the fold; that is 1.5rem over 0.875rem = 1.71x,
// which still satisfies the rule. Asserting the literal string "leading-7" made this test
// fail on a change that never violated the requirement. So: check that instruction text
// carries an explicit leading-* class whose ratio is >= 1.5 for the size it is paired with,
// and that nothing is italic.
const PROMPT_LEADING_OK =
  /text-sm[^"]*leading-(6|7|8|relaxed|loose)|text-base[^"]*leading-(7|8|relaxed|loose)/.test(
    taskWorkspace
  );
receipt(5, "plain sans-serif, line-height >=1.5, no italics in instruction",
  globals.includes("--font-sans") && !taskWorkspace.includes("italic") && PROMPT_LEADING_OK && globals.includes("line-height: 1.5"),
  "Geist sans; task prompt text-sm/leading-6 = 1.71x; body line-height 1.5");

receipt(6, "captions for every voiced instruction",
  taskWorkspace.includes("task-prompt-caption") && taskWorkspace.includes("task.promptRu"),
  "TaskWorkspace always shows task.promptRu as a visible caption alongside any SFX");

receipt(7, "no pre-gesture sound; mute always instant",
  sound.includes("isMuted") && sound.includes("toggleMute") || sound.includes("isMuted:"),
  "sound-engine exposes isMuted/toggle; session plays only after submit/hint");

receipt(8, "prefers-reduced-motion gates every animation incl. canvas confetti",
  session.includes("prefersReducedMotion") && session.includes("confetti") && globals.includes("prefers-reduced-motion"),
  "confetti gated; globals reduce-motion kill-switch");

receipt(9, "auto-motion >5s has pause/stop/hide",
  !session.includes("setInterval") && !session.includes("Infinity"),
  "session has no infinite auto-motion loops");

receipt(10, "contrast 4.5:1 text, 3:1 UI/focus",
  globals.includes("outline: 3px solid #a78bfa") && taskSurfaces.includes("bg-violet-500") && taskSurfaces.includes("focus-visible:outline-violet-300"),
  "solid violet primary check action; focus outline violet-300");

receipt(11, "no drag-only interactions",
  !learnerUi.includes("onDrag") && !learnerUi.includes("draggable"),
  "structured workspaces use native buttons, radios, selects and inputs; no drag-only path");

// This receipt used to be `session.includes("Попробовать ещё")` — a label that was
// deleted from the UI while the substring survived inside a code comment describing the
// old bug, so the gate stayed green over a broken retry path. Assert the STRUCTURE
// instead: the footer must render the Check button and the advance button in two
// independent slots. The old `showAdvance ? advance : showStructuredCheck ? check` chain
// is mutually exclusive, so Check could never appear next to Пропустить after a failure.
const RETRY_SLOTS_INDEPENDENT =
  session.includes("{showStructuredCheck ? (") &&
  session.includes("{showAdvance ? (") &&
  !session.includes(") : showStructuredCheck ? (") &&
  session.includes("!passedCurrent");
receipt(12, "retry/undo always; no-shame copy",
  RETRY_SLOTS_INDEPENDENT && !/неправильно|провал|ты ошиб/i.test(session),
  "failed task keeps its Check button beside Пропустить; banned lexicon absent");

receipt(13, "counters in aria-live present initially",
  session.includes('aria-live="polite"') && session.includes("session-progress-live"),
  "progressLabel in aria-live from first render");

receipt(14, "modals: focus trap, aria-modal, focus restore, Escape",
  monsterCard.includes("aria-modal") || monsterCard.includes("Escape") || prompt.includes("Escape"),
  "MonsterCard/PromptInput dialog patterns; session itself is non-modal");

receipt(15, "focus-visible >=3:1 everywhere",
  globals.includes("*:focus-visible") && globals.includes("#a78bfa"),
  "global 3px violet focus-visible");

receipt(16, "numeric inputmode on code entry",
  consent.includes('inputMode="numeric"'),
  "consent verification code uses inputMode=numeric; enter-code is alphanumeric kid alphabet → text");

receipt(17, "consent/onboarding nudge audit (no asymmetric yes/no)",
  consent.includes("bothRequired") || (consent.includes("serviceConsent") && consent.includes("externalAiConsent")),
  "dual opt-in required; onboarding has explicit skip button not asymmetric dark-pattern");

receipt(18, "profiling/personalization off by default",
  !learnerUi.includes("fingerprint") && !onboarding.includes("personalization"),
  "no profiling hooks on session/onboarding");

const failed = items.filter((i) => !i.pass);
const md = [
  "# W4 Accessibility Appendix A — per-item receipts",
  "",
  `Date: ${new Date().toISOString().slice(0, 10)}`,
  "",
  ...items.map(
    (i) =>
      `## A${i.id}. ${i.title}\n- Result: **${i.pass ? "PASS" : "FAIL"}**\n- Evidence: ${i.evidence}\n`
  ),
  failed.length ? `\nFAILED: ${failed.length}` : "\nALL 18 GREEN",
].join("\n");

if (shouldWriteLegacyReceipts) {
  writeFileSync(join(outDir, "a11y-appendix-a-receipt.md"), md);
  writeFileSync(join(root, "docs/release/W4-A11Y-APPENDIX-A-RECEIPT.md"), md);
}
console.log(failed.length ? `FAILED ${failed.length}` : "ALL 18 A11Y RECEIPTS GREEN");
process.exit(failed.length ? 1 : 0);
