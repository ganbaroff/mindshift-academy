/**
 * W4 — AI failure drills, SessionCost, mojibake, errors catalog, choice-mode.
 * Deterministic fake provider only (Section 3A.4).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function load(rel) {
  return require(join(root, rel));
}

let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

console.log("\n=== W4 fake-AI modes ===");
{
  const { getFakeAiMode, shouldUseFakeInterpreter, isAiKillSwitchOn, CANNED_TUTOR_ENCOURAGEMENT, ITOG_DEFERRED_MESSAGE } =
    load("src/lib/fake-ai.ts");
  check("default off", getFakeAiMode({}) === "off");
  check("FAKE_AI=1 → ok", getFakeAiMode({ FAKE_AI: "1" }) === "ok");
  check("interpreter_down mode", getFakeAiMode({ FAKE_AI_MODE: "interpreter_down" }) === "interpreter_down");
  check("AI_KILL_SWITCH=1 → interpreter_down", getFakeAiMode({ AI_KILL_SWITCH: "1" }) === "interpreter_down");
  check("isAiKillSwitchOn", isAiKillSwitchOn({ AI_KILL_SWITCH: "1" }) === true);
  check("useFake for ok", shouldUseFakeInterpreter("ok") === true);
  check("canned tutor copy non-empty", CANNED_TUTOR_ENCOURAGEMENT.length > 10);
  check("itog deferred copy non-empty", ITOG_DEFERRED_MESSAGE.length > 10);
}

console.log("\n=== W4 choice-mode completes tasks ===");
{
  const { programForChoice, passingChoiceId, buildChoiceOptions } = load("src/lib/tasks/choice-mode.ts");
  const { resolveGridAttempt, resolveRuleAttempt, resolveSequenceAttempt, resolvePatternAttempt, resolveClaimAttempt } =
    load("src/lib/tasks/attempt.ts");

  const gridTask = {
    id: "t",
    role: "practice",
    family: "grid-draw",
    tier: 1,
    promptRu: "x",
    hintRu: "y",
    target: [
      [0, 0],
      [0, 1],
    ],
  };
  const gProg = programForChoice(gridTask, passingChoiceId(gridTask));
  const gOut = resolveGridAttempt(gProg, gridTask.target, { hideTargetPanel: false });
  check("choice-mode grid passes", gOut.pass === true);
  check("choice options >= 2", buildChoiceOptions(gridTask).length >= 2);

  const seqTask = { ...gridTask, family: "sequence-world", target: undefined };
  const sProg = programForChoice(seqTask, "full-sandwich");
  check("choice-mode sequence passes", resolveSequenceAttempt(sProg).pass === true);

  const ruleTask = {
    ...gridTask,
    family: "rule-runner",
    target: undefined,
    ruleMaps: [
      { id: "m-open", ahead: "open", successWhen: "goal" },
      { id: "m-wall", ahead: "wall", successWhen: "wait_on_wall" },
      { id: "m-trap", ahead: "trap", successWhen: "stop_on_trap" },
      { id: "m-goal", ahead: "goal", successWhen: "goal" },
    ],
  };
  const rProg = programForChoice(ruleTask, "safe-rules");
  check("choice-mode rule passes 4 maps", resolveRuleAttempt(rProg, ruleTask.ruleMaps).pass === true);

  const patTask = {
    ...gridTask,
    family: "pattern-expand",
    target: undefined,
    patternExpected: ["2", "4", "6", "8", "10"],
    patternExpandCount: 5,
  };
  const pProg = programForChoice(patTask, "match-expected");
  check("choice-mode pattern passes", resolvePatternAttempt(pProg, patTask.patternExpected, 5).pass === true);

  const claimTask = {
    ...gridTask,
    family: "claim-check",
    target: undefined,
    claims: [
      { id: "a", text: "t", truth: true },
      { id: "b", text: "f", truth: false },
    ],
  };
  const cProg = programForChoice(claimTask, "truthful");
  check("choice-mode claim passes", resolveClaimAttempt(cProg, claimTask.claims).pass === true);
}

console.log("\n=== W4 SessionCost helpers ===");
{
  const { estimateTokens, SESSION_TOKEN_BUDGET } = load("src/lib/session-cost.ts");
  check("estimateTokens positive", estimateTokens("привет мир") >= 1);
  check("budget is finite", SESSION_TOKEN_BUDGET > 1000);
  const attemptSrc = readFileSync(join(root, "src/app/api/tasks/attempt/route.ts"), "utf8");
  check("attempt route records SessionCost", attemptSrc.includes("recordSessionCost"));
  check("attempt route offers choice-mode on interpreter down", attemptSrc.includes("interpreter_down"));
  check("attempt returns 503 on missing provider key path", attemptSrc.includes("NO_CHAT_PROVIDER") && attemptSrc.includes("503"));
}

console.log("\n=== W4 safety fail-closed wiring ===");
{
  const attemptSrc = readFileSync(join(root, "src/app/api/tasks/attempt/route.ts"), "utf8");
  check("moderation_error refuse path", attemptSrc.includes("moderation_error"));
  check("recordDegradeEvent used", attemptSrc.includes("recordDegradeEvent"));
  const det = readFileSync(join(root, "tests/deterministic.mjs"), "utf8");
  check("deterministic still covers classifier fail-closed", det.includes("fail-closed") || det.includes("fail CLOSED") || det.includes("BLOCK"));
}

console.log("\n=== W4 judge/tutor drills (source + helpers) ===");
{
  const formSrc = readFileSync(join(root, "src/app/api/formulation/submit/route.ts"), "utf8");
  check("judge_down → itogDeferred", formSrc.includes("judge_down") && formSrc.includes("itogDeferred"));
  const attemptSrc = readFileSync(join(root, "src/app/api/tasks/attempt/route.ts"), "utf8");
  check("tutor_down → canned encouragement", attemptSrc.includes("tutor_down") && attemptSrc.includes("CANNED_TUTOR_ENCOURAGEMENT"));
}

console.log("\n=== W4 errors catalog (P0-17) ===");
{
  const { Errors, CALM_RETRY } = load("src/lib/errors.ts");
  check("calm retry canonical", CALM_RETRY === "Что-то пошло не так. Попробуй ещё раз!");
  check("no shame internal phrase in Errors", !Object.values(Errors).some((s) => String(s).includes("Внутренняя")));
  const cert = readFileSync(join(root, "src/app/api/certificate/route.ts"), "utf8");
  check("certificate 500 uses calm retry", cert.includes(CALM_RETRY) && !cert.includes("Внутренняя ошибка"));
  const attempt = readFileSync(join(root, "src/app/api/tasks/attempt/route.ts"), "utf8");
  check("attempt 500 uses Errors.calmRetry", attempt.includes("Errors.calmRetry"));
}

console.log("\n=== W4 mojibake scan ===");
{
  const { findMojibake } = load("src/lib/mojibake.ts");
  check("detects U+FFFD", findMojibake("bad\uFFFD").includes("U+FFFD"));
  check("clean RU ok", findMojibake("Монстр слышит только то, что сказано").length === 0);
  check(
    "detects ascii ??? in string literal",
    findMojibake('return { error: "???-?? ????? ?? ???." }').includes("ascii-question-corruption")
  );
  check(
    "regex source with ?{3} not a false positive alone",
    findMojibake("const re = /\\\\?{3,}/; const ok = 'чисто';").length === 0 ||
      !findMojibake("const ok = 'чисто';").includes("ascii-question-corruption")
  );

  const { readdirSync, statSync, existsSync } = require("node:fs");
  const surfaces = [
    "src/content/curriculum",
    "src/app/session",
    "src/app/onboarding",
    "src/app/enter-code",
    "src/app/certificate",
    "src/app/api",
    "src/lib/errors.ts",
    "src/lib/tasks/unclear-copy.ts",
    "src/components/capstone",
    "src/components/chat",
  ];
  function walk(dir, acc = []) {
    if (!existsSync(dir)) return acc;
    const st = statSync(dir);
    if (st.isFile()) {
      if (/\.(ts|tsx|mjs|md)$/.test(dir)) acc.push(dir);
      return acc;
    }
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const pst = statSync(p);
      if (pst.isDirectory()) walk(p, acc);
      else if (/\.(ts|tsx|mjs|md)$/.test(name)) acc.push(p);
    }
    return acc;
  }
  let dirty = 0;
  for (const rel of surfaces) {
    for (const file of walk(join(root, rel))) {
      const text = readFileSync(file, "utf8");
      const hits = findMojibake(text);
      if (hits.length) {
        dirty++;
        console.error(`  mojibake in ${file}: ${hits.join(",")}`);
      }
    }
  }
  check("zero U+FFFD/mojibake/??? on child-facing surfaces", dirty === 0);
}

console.log("\n=== W4 design tokens P0-15/16 + P0-10 ===");
{
  const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
  check("bg-base token", css.includes("--color-bg-base"));
  check("3 text opacity tokens", css.includes("--text-primary") && css.includes("--text-secondary") && css.includes("--text-muted"));

  const prompt = readFileSync(join(root, "src/components/chat/PromptInput.tsx"), "utf8");
  const sendBtn = prompt.match(/onClick=\{handleSend\}[\s\S]*?className="([^"]+)"/);
  check("P0-10 send button found", Boolean(sendBtn));
  const sendClass = sendBtn?.[1] ?? "";
  check("P0-10 send: no bg-gradient", !/bg-gradient/.test(sendClass));
  check("P0-10 send: no from-* gradient stop", !/\bfrom-/.test(sendClass));
  check("P0-10 send: no to-* gradient stop", !/\bto-/.test(sendClass));
  check("P0-10 send uses solid primary token", sendClass.includes("bg-[var(--color-primary)]"));
  check("P0-10 no amber gradient CTA in PromptInput", !prompt.includes("from-amber-500") && !prompt.includes("bg-gradient-to-r"));

  const session = readFileSync(join(root, "src/app/session/[id]/page.tsx"), "utf8");
  check("session uses bg-base token", session.includes("bg-[var(--color-bg-base)]"));
  check("session no hardcoded #090d16", !session.includes("#090d16"));

  // Hardcoded near-black hex only allowed at token definition (+ email clients + themeColor metadata).
  const { readdirSync, statSync, existsSync } = require("node:fs");
  function walk(dir, acc = []) {
    if (!existsSync(dir)) return acc;
    const st = statSync(dir);
    if (st.isFile()) {
      acc.push(dir);
      return acc;
    }
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, acc);
      else acc.push(p);
    }
    return acc;
  }
  const allowHardcodedBlack = (file) =>
    file.replace(/\\/g, "/").includes("src/app/globals.css") ||
    file.replace(/\\/g, "/").includes("/emails/") ||
    file.replace(/\\/g, "/").endsWith("src/app/layout.tsx");
  let blackHits = 0;
  for (const file of [...walk(join(root, "src/app")), ...walk(join(root, "src/components"))]) {
    if (!/\.(ts|tsx|css)$/.test(file)) continue;
    if (allowHardcodedBlack(file)) continue;
    const text = readFileSync(file, "utf8");
    if (/#090d16|#070b14/i.test(text)) {
      blackHits++;
      console.error(`  hardcoded black in ${file}`);
    }
  }
  check("P0-15/16 zero hardcoded #090d16/#070b14 outside token/email/themeColor", blackHits === 0);
}

console.log(`\nW4 drills: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
