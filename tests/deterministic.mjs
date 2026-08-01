#!/usr/bin/env node
/**
 * DETERMINISTIC test lane — the reliable `npm test` gate.
 *
 * Pure and self-contained: NO dev server, NO live LLM provider, NO database. Every assertion
 * is a function of source code + fixed inputs, so it runs in well under a second and can NEVER
 * hang or flap. This is the CI gate. The flaky, provider-dependent safety checks live in the
 * SEPARATE live lane (tests/safety.test.mjs, `npm run test:live`) with a hard deadline.
 *
 * Covers:
 *   P0-PRIV  /api/generate-silhouette egresses NOTHING pre-consent (static import guard) and
 *            its deterministic output never echoes the raw child words.
 *   STATE    progression seams — lock/unlock, reward-map drift, modal-on-replay, reconcile.
 *   SAFETY   moderate() fails CLOSED when a classifier throws (the sacred branch), via a mock.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, "..");

let pass = 0;
let fail = 0;
const fails = [];
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    fails.push(name);
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

// ---- P0-PRIV: static no-egress guard on the silhouette route ----
console.log("=== P0-PRIV: silhouette route has NO external-AI egress ===");
const silRoute = readFileSync(join(root, "src/app/api/generate-silhouette/route.ts"), "utf8");
const forbidden = ["ai-provider", "getAIClient", "@/lib/moderation", 'from "openai"', "from 'openai'"];
for (const f of forbidden) {
  check(`route does not reference ${f}`, !silRoute.includes(f), `(found "${f}" — a possible egress path!)`);
}

// ---- P0-PRIV: deterministic silhouette (pure fn, no network) ----
const { deterministicSilhouette } = await import("../src/lib/silhouette.ts");
const words = ["храбрый", "быстрый", "весёлый"];
const a = deterministicSilhouette(words);
const b = deterministicSilhouette(words);
check("same words -> identical output (deterministic)", JSON.stringify(a) === JSON.stringify(b));
check("output has {name,emoji,color,description}", Boolean(a.name && a.emoji && a.color && a.description));
check(
  "public silhouette preview uses neutral copy without a pet-based prompt to continue",
  a.description === "Вот предварительный силуэт будущего персонажа.",
  `(description=${JSON.stringify(a.description)})`,
);
const abusive = ["убей", "всех", "детей"];
const out = JSON.stringify(deterministicSilhouette(abusive)).toLowerCase();
const echoed = abusive.some((word) => out.includes(word));
check("abusive words are NOT echoed back in the response", !echoed, `(echoed input: ${out})`);

// ---- STATE: progression seams (pure) ----
console.log("=== STATE: progression seams ===");
const { deriveLockState, modalShouldOpen, completedLessonIdsFromUser, stepReward } = await import(
  "../src/lib/progression.ts"
);
const { getLesson } = await import("../src/lib/curriculum.ts");
const { isPublicApiPath, hasDevTestBypass } = await import("../src/lib/request-access.ts");
const { academyEntryRedirect, parentConsentRedirect, signedInContinuePath } = await import("../src/lib/academy-access.ts");
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);

check("modal-on-replay stays shut (challengeCompleted but no grant)", modalShouldOpen(true, null) === false);
check("modal-on-real-grant opens", modalShouldOpen(true, { xp: 100, crystals: 10 }) === true);

const payload = { progress: [1, 2, 3].map((o) => ({ completed: true, lesson: { order: o } })) };
check("reconcile rebuilds completed set from server truth", eq(completedLessonIdsFromUser(payload), [1, 2, 3]));

const locks = deriveLockState([1, 2, 3, 4], 1);
check("backward-nav keeps later lessons unlocked", [2, 3, 4].every((id) => locks[id] !== "locked"));

const drift = [];
for (let l = 1; l <= 5; l += 1) {
  const r = stepReward(l);
  const lesson = getLesson(l);
  const wantNext = Math.min(l + 1, 5);
  if (!r || !lesson || r.xp !== lesson.reward.xp || r.crystals !== lesson.reward.crystals || r.next !== wantNext) {
    drift.push(`L${l}`);
  }
}
check("reward map matches curriculum (no drift)", drift.length === 0, `(drift: ${drift.join(",")})`);
check(
  "lesson 1 judge accepts the exact three-quality example shown in the child UI",
  getLesson(1)?.rubric.includes("Список из трёх качеств без слов «мой монстр» тоже является описанием") === true,
  "the judge rubric must not reject the UI's own example: «храбрый, быстрый, весёлый»"
);

// ---- AUTH: proxy route policy stays explicit and test-only bypass is inert in prod ----
console.log("=== AUTH: request boundary policy ===");
check(
  "only declared public Academy APIs bypass Clerk",
  isPublicApiPath("/api/generate-silhouette") &&
    isPublicApiPath("/api/checkout") &&
    isPublicApiPath("/api/cron/mood-decay") &&
    isPublicApiPath("/api/cron/weekly-report") &&
    !isPublicApiPath("/api/user") &&
    !isPublicApiPath("/api/chat") &&
    !isPublicApiPath("/api/cron"),
  "public API allow-list is too broad or missing a required route"
);
const bypassHeaders = new Headers({ "x-test-bypass": "true" });
check(
  "test bypass is development-only",
  hasDevTestBypass(bypassHeaders, "development") === true &&
    hasDevTestBypass(bypassHeaders, "production") === false,
  "production must ignore x-test-bypass"
);
check(
  "Academy entry sends only signed-in, allowlisted accounts without consent to /consent",
  academyEntryRedirect({ signedIn: false, allowed: false, consentValid: false }) === null &&
    academyEntryRedirect({ signedIn: true, allowed: false, consentValid: false }) === "/no-access" &&
    academyEntryRedirect({ signedIn: true, allowed: true, consentValid: false }) === "/consent" &&
    academyEntryRedirect({ signedIn: true, allowed: true, consentValid: true }) === null,
  "entry policy must preserve unauthenticated Clerk handling and prioritise allowlist before consent"
);
check(
  "signed-in continue path never leaves ready learners on a dead code form",
  signedInContinuePath({
    signedIn: true,
    allowed: true,
    consentValid: true,
    hasMonster: true,
    nextSessionId: "w1-s2",
  })?.href === "/session/w1-s2" &&
    signedInContinuePath({
      signedIn: false,
      allowed: true,
      consentValid: true,
      hasMonster: true,
      nextSessionId: "w1-s1",
    }) === null
);
check(
  "parent consent route sends signed-out parents to sign-in and denied accounts to no-access",
  typeof parentConsentRedirect === "function" &&
    parentConsentRedirect({ signedIn: false, allowed: false }) === "/sign-in" &&
    parentConsentRedirect({ signedIn: true, allowed: false }) === "/no-access" &&
    parentConsentRedirect({ signedIn: true, allowed: true }) === null,
  "the parental route must be a clear, allowlist-protected continuation after Clerk"
);
const consentLayoutPath = join(root, "src/app/consent/layout.tsx");
const consentLayoutSource = existsSync(consentLayoutPath) ? readFileSync(consentLayoutPath, "utf8") : "";
const consentRequestSource = readFileSync(join(root, "src/app/api/consent/request-code/route.ts"), "utf8");
const consentVerifySource = readFileSync(join(root, "src/app/api/consent/verify/route.ts"), "utf8");
check(
  "consent page layout applies the signed-in parent access policy before rendering the form",
  consentLayoutSource.includes("parentConsentRedirect") && consentLayoutSource.includes("getViewerAccess"),
  "the consent form must not be a dead-end or visible to a denied account"
);
check(
  "consent code APIs reject a signed-in account that is not allowed into Academy",
  consentRequestSource.includes("isEmailAllowed") &&
    consentRequestSource.includes("status: 403") &&
    consentVerifySource.includes("isEmailAllowed") &&
    consentVerifySource.includes("status: 403"),
  "a Clerk session alone must never create or verify Academy consent"
);
const manageConsentSource = readFileSync(
  join(root, "src/components/dashboard/ManageConsent.tsx"),
  "utf8"
);
check(
  "parent dashboard exposes the permanent Academy-data deletion control",
  manageConsentSource.includes('fetch("/api/child-data", { method: "DELETE"') &&
    manageConsentSource.includes("Удалить данные ребёнка"),
  "dashboard must invoke the authenticated DELETE /api/child-data route"
);

// ---- P0-PRIV: weekly parent reports must use only the verified consent recipient ----
console.log("=== PRIVACY: weekly reports use current parental consent ===");
const weeklyReportRoute = readFileSync(join(root, "src/app/api/cron/weekly-report/route.ts"), "utf8");
const { selectWeeklyReportRecipients } = await import("../src/lib/weekly-report-recipients.ts").catch(
  () => ({ selectWeeklyReportRecipients: undefined })
);
const { CONSENT_VERSION, isCurrentValidConsent } = await import("../src/lib/consent-policy.ts");
const weeklyUsers = [
  { id: "active", clerkId: "parent_active", username: "child-alias", monster: { name: "Искра" } },
  { id: "revoked", clerkId: "parent_revoked", username: "stale@example.com", monster: { name: "Тень" } },
  { id: "stale", clerkId: "parent_stale", username: "old@example.com", monster: { name: "Ветер" } },
  { id: "no-ai-opt-in", clerkId: "parent_no_ai", username: "wrong@example.com", monster: { name: "Молния" } },
];
const weeklyConsents = [
  {
    clerkId: "parent_active",
    parentEmail: "verified.parent@example.com",
    verifiedAt: new Date("2026-07-18T00:00:00Z"),
    revokedAt: null,
    serviceConsent: true,
    externalAiConsent: true,
    consentVersion: CONSENT_VERSION,
  },
  {
    clerkId: "parent_revoked",
    parentEmail: "revoked.parent@example.com",
    verifiedAt: new Date("2026-07-18T00:00:00Z"),
    revokedAt: new Date("2026-07-18T01:00:00Z"),
    serviceConsent: true,
    externalAiConsent: true,
    consentVersion: CONSENT_VERSION,
  },
  {
    clerkId: "parent_stale",
    parentEmail: "stale.parent@example.com",
    verifiedAt: new Date("2026-07-18T00:00:00Z"),
    revokedAt: null,
    serviceConsent: true,
    externalAiConsent: true,
    consentVersion: "2020-01-01",
  },
  {
    clerkId: "parent_no_ai",
    parentEmail: "no-ai.parent@example.com",
    verifiedAt: new Date("2026-07-18T00:00:00Z"),
    revokedAt: null,
    serviceConsent: true,
    externalAiConsent: false,
    consentVersion: CONSENT_VERSION,
  },
];
const weeklyRecipients =
  typeof selectWeeklyReportRecipients === "function"
    ? selectWeeklyReportRecipients(weeklyUsers, weeklyConsents, isCurrentValidConsent)
    : [];
check(
  "weekly reports select only the active verified parent email, never child username",
  eq(weeklyRecipients.map(({ user, parentEmail }) => ({ id: user.id, parentEmail })), [
    { id: "active", parentEmail: "verified.parent@example.com" },
  ]),
  "revoked, stale and incomplete consent must not receive reports"
);
check(
  "weekly-report route uses the consent-selected recipient instead of user.username",
  weeklyReportRoute.includes("selectWeeklyReportRecipients") && !weeklyReportRoute.includes("to: user.username"),
  "the cron must never send a child progress report to User.username"
);
check(
  "weekly-report route requires the configured verified Resend sender",
  weeklyReportRoute.includes("process.env.RESEND_FROM") && !weeklyReportRoute.includes('from: "MindShift Academy'),
  "the cron must not hard-code an unverified sender"
);

// ---- PROVIDER: Azure GPT is opt-in, bounded, and re-consented ----
console.log("=== PROVIDER: Azure GPT tutor routing + consent ===");
const aiProvider = await import("../src/lib/ai-provider.ts");
const selectChatProvider = aiProvider.selectChatProvider;
const azureEnv = {
  AZURE_OPENAI_KEY: "primary-key",
  AZURE_OPENAI_ENDPOINT: "https://volaura-ai.openai.azure.com",
  AZURE_OPENAI_DEPLOYMENT: "gpt-4o",
  AZURE_OPENAI_API_VERSION: "2024-10-21",
  GEMINI_API_KEY: "gemini-key",
};
check(
  "complete Azure GPT config takes tutor precedence over Gemini",
  typeof selectChatProvider === "function" && selectChatProvider(azureEnv) === "azure",
  `(provider=${typeof selectChatProvider === "function" ? selectChatProvider(azureEnv) : "missing"})`
);
check(
  "Azure GPT accepts the rotation key when the primary key is absent",
  typeof selectChatProvider === "function" && selectChatProvider({
    ...azureEnv,
    AZURE_OPENAI_KEY: "",
    AZURE_OPENAI_KEY2: "rotation-key",
  }) === "azure",
  "secondary Azure key must be a safe rotation fallback"
);
check(
  "incomplete Azure config falls back to Gemini rather than making an invalid Azure call",
  typeof selectChatProvider === "function" && selectChatProvider({
    ...azureEnv,
    AZURE_OPENAI_ENDPOINT: "",
  }) === "gemini",
  "Azure needs a key, endpoint, deployment and API version"
);
const aiProviderSource = readFileSync(join(root, "src/lib/ai-provider.ts"), "utf8");
const chatRouteSource = readFileSync(join(root, "src/app/api/chat/route.ts"), "utf8");
check(
  "Azure GPT client keeps the 12-second, zero-retry spend/latency bound",
  aiProviderSource.includes("AzureOpenAI") &&
    aiProviderSource.includes("timeout: 12000") &&
    aiProviderSource.includes("maxRetries: 0"),
  "Azure tutor calls must not silently add retries or an unbounded timeout"
);
check(
  "Azure tutor routing keeps Gemini/NVIDIA safety clients separate from tutor generation",
  chatRouteSource.includes("const safety = provider.getSafetyClient()") &&
    chatRouteSource.includes("moderate(guardClient, safety.client, safety.model, userPrompt)") &&
    /moderate\(guardClient, safety!?\.client, safety!?\.model, aiMessageText\)/.test(chatRouteSource),
  "Azure GPT must not become the only input/output safety client"
);
const consentPageSource = readFileSync(join(root, "src/app/consent/page.tsx"), "utf8");
const activationPageSource = readFileSync(join(root, "src/app/activate/page.tsx"), "utf8");
const oldConsent = {
  verifiedAt: new Date("2026-07-24T00:00:00Z"),
  revokedAt: null,
  serviceConsent: true,
  externalAiConsent: true,
  consentVersion: "2026-06-28",
};
check(
  "Azure GPT disclosure increments the consent version so prior consent is stale",
  CONSENT_VERSION === "2026-07-24" && isCurrentValidConsent(oldConsent) === false,
  `(current=${CONSENT_VERSION} oldValid=${isCurrentValidConsent(oldConsent)})`
);
check(
  "both parental-consent surfaces name Microsoft Azure OpenAI as the tutor/judge processor",
  consentPageSource.includes("Microsoft Azure OpenAI") && activationPageSource.includes("Microsoft Azure OpenAI"),
  "parent disclosure must name the actual child-message processor"
);

// ---- PEDAGOGY: safe output fallback remains lesson-specific ----
console.log("=== PEDAGOGY: output-safety fallbacks ===");
const { safeLessonFallback } = await import("../src/lib/safe-lesson-fallback.ts");
const { isLessonRelevantTutorReply } = await import("../src/lib/lesson-output.ts");
const l3Fallback = safeLessonFallback(3);
check(
  "lesson 3 safety fallback still demonstrates the cipher skill",
  /\*/.test(l3Fallback) && /(шифр|ш\*фр)/i.test(l3Fallback),
  `(response=${JSON.stringify(l3Fallback)})`
);
check(
  "every lesson has a non-generic safety fallback",
  [1, 2, 3, 4, 5].every((step) => safeLessonFallback(step).length > 12 && safeLessonFallback(step) !== safeLessonFallback(0)),
  "one or more lessons fall back to generic copy"
);
check(
  "cipher lesson rejects a generated reply that does not demonstrate the cipher",
  isLessonRelevantTutorReply(3, "Хор-р-рошо, юный к-р-р-р-р-р") === false &&
    isLessonRelevantTutorReply(3, "Ш*фр включён: гл*сны* заменены.") === true,
  "lesson 3 requires a visible cipher marker before its output reaches the child"
);

// ---- SAFETY: fail-closed moderation (mock, no live call) ----
console.log("=== SAFETY: moderate() fails CLOSED on classifier error ===");
const { moderate, CLASSIFIER_TIMEOUT_MS } = await import("../src/lib/moderation.ts");
const moderationSource = readFileSync(join(root, "src/lib/moderation.ts"), "utf8");
const regressionSource = readFileSync(join(root, "scripts/regression.mjs"), "utf8");
const primaryFallbackSource = moderationSource.slice(
  moderationSource.indexOf("async function geminiPrimaryGuard"),
  moderationSource.indexOf("function finalizeModeration")
);
check(
  "Gemini primary safety fallback explicitly preserves course cipher and rule instructions",
  primaryFallbackSource.includes("шифровать буквы") &&
    primaryFallbackSource.includes("НЕ путай с джейлбрейком") &&
    primaryFallbackSource.includes("если…то"),
  "the primary fallback must not misclassify the Academy's own safe lesson instructions"
);
check(
  "live regression mirrors the separate production safety client rather than the Azure tutor client",
  regressionSource.includes("getSafetyClient") &&
    regressionSource.includes("const safety = getSafetyClient()") &&
    regressionSource.includes("moderate(guardClient, safety.client, safety.model, prompt)"),
  "Azure tutor and Gemini/NVIDIA safety calls must remain independently tested"
);
const throwing = { chat: { completions: { create: async () => { throw new Error("simulated outage"); } } } };
const r = await moderate(throwing, throwing, "gemini-2.5-flash", "любой безобидный текст");
check(
  "classifier outage -> fail-closed BLOCK",
  r.safe === false && r.source === "fail-closed",
  `(safe=${r.safe} source=${r.source})`
);

const safeGemini = {
  chat: {
    completions: {
      create: async ({ messages }) => ({
        choices: [{ message: { content: JSON.stringify(
          messages[0]?.content.includes("ОСНОВНОЙ SAFETY-КЛАССИФИКАТОР")
            ? { unsafe: false, category: "primary-safe" }
            : { unsafe: false, category: "kidnet-safe" }
        ) } }],
      }),
    },
  },
};
const unsafePrimaryGemini = {
  chat: {
    completions: {
      create: async ({ messages }) => ({
        choices: [{ message: { content: JSON.stringify(
          messages[0]?.content.includes("ОСНОВНОЙ SAFETY-КЛАССИФИКАТОР")
            ? { unsafe: true, category: "violence" }
            : { unsafe: false, category: "kidnet-safe" }
        ) } }],
      }),
    },
  },
};
const noNvidiaSafe = await moderate(null, safeGemini, "gemini-test", "Расскажи мне про город Херсон");
check(
  "safe text passes when the unavailable NVIDIA guard is replaced by two valid Gemini checks",
  noNvidiaSafe.safe === true,
  `(safe=${noNvidiaSafe.safe} source=${noNvidiaSafe.source})`
);
const noNvidiaUnsafe = await moderate(null, unsafePrimaryGemini, "gemini-test", "опасный запрос");
check(
  "an unsafe Gemini primary fallback still blocks",
  noNvidiaUnsafe.safe === false,
  `(safe=${noNvidiaUnsafe.safe} source=${noNvidiaUnsafe.source})`
);

let primaryTimeoutAttempts = 0;
const primaryTimeoutGemini = {
  chat: {
    completions: {
      create: async ({ messages }) => {
        if (messages[0]?.content.includes("ОСНОВНОЙ SAFETY-КЛАССИФИКАТОР")) {
          primaryTimeoutAttempts += 1;
          const timeout = new Error("simulated primary timeout");
          timeout.name = "APIConnectionTimeoutError";
          throw timeout;
        }
        return { choices: [{ message: { content: '{"unsafe":false}' } }] };
      },
    },
  },
};
const primaryTimeoutResult = await moderate(null, primaryTimeoutGemini, "gemini-test", "обычный текст");
check(
  "a timed-out Gemini primary fallback gets one attempt so the chat request remains bounded",
  primaryTimeoutResult.safe === false && primaryTimeoutAttempts === 1,
  `(safe=${primaryTimeoutResult.safe} attempts=${primaryTimeoutAttempts})`
);
check(
  "each safety-classifier attempt leaves headroom for the fallback within the 20-second chat budget",
  Number.isInteger(CLASSIFIER_TIMEOUT_MS) && CLASSIFIER_TIMEOUT_MS <= 6000,
  `(CLASSIFIER_TIMEOUT_MS=${String(CLASSIFIER_TIMEOUT_MS)})`
);

let nvidiaTimeoutAttempts = 0;
const unavailableNvidia = {
  chat: {
    completions: {
      create: async () => {
        nvidiaTimeoutAttempts += 1;
        const timeout = new Error("simulated NVIDIA timeout");
        timeout.name = "APIConnectionTimeoutError";
        throw timeout;
      },
    },
  },
};
const nvidiaFallbackResult = await moderate(unavailableNvidia, safeGemini, "gemini-test", "обычный текст");
check(
  "one unavailable NVIDIA guard attempt opens the Gemini safety fallback without a second 6-second wait",
  nvidiaFallbackResult.safe === true && nvidiaTimeoutAttempts === 1,
  `(safe=${nvidiaFallbackResult.safe} attempts=${nvidiaTimeoutAttempts})`
);
const nvidiaCircuitResult = await moderate(unavailableNvidia, safeGemini, "gemini-test", "ещё один обычный текст");
check(
  "the NVIDIA cooldown reuses the strict Gemini fallback instead of delaying the output guard again",
  nvidiaCircuitResult.safe === true && nvidiaTimeoutAttempts === 1,
  `(safe=${nvidiaCircuitResult.safe} attempts=${nvidiaTimeoutAttempts})`
);

let kidNetFinished = false;
let primaryStartedWhileKidNetWasPending = false;
const concurrentFallbackGemini = {
  chat: {
    completions: {
      create: async ({ messages }) => {
        if (messages[0]?.content.includes("ОСНОВНОЙ SAFETY-КЛАССИФИКАТОР")) {
          primaryStartedWhileKidNetWasPending = !kidNetFinished;
          return { choices: [{ message: { content: '{"unsafe":false}' } }] };
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
        kidNetFinished = true;
        return { choices: [{ message: { content: '{"unsafe":false}' } }] };
      },
    },
  },
};
const concurrentFallbackResult = await moderate(null, concurrentFallbackGemini, "gemini-test", "обычный текст");
check(
  "when NVIDIA is unavailable, both required Gemini guards start concurrently",
  concurrentFallbackResult.safe === true && primaryStartedWhileKidNetWasPending,
  `(safe=${concurrentFallbackResult.safe} concurrent=${primaryStartedWhileKidNetWasPending})`
);

const privacyGuardFalsePositive = {
  chat: { completions: { create: async () => ({ choices: [{ message: { content: "unsafe\nS7" } }] }) } },
};
const safeKidnet = {
  chat: { completions: { create: async () => ({ choices: [{ message: { content: '{"unsafe":false}' } }] }) } },
};
const knownNonsense = await moderate(
  privacyGuardFalsePositive,
  safeKidnet,
  "kidnet-test",
  "asdf qwe 123 бла"
);
check(
  "known harmless keyboard gibberish is not rejected solely by an S7 guard false-positive",
  knownNonsense.safe === true && knownNonsense.source === "privacy-disagreement",
  `(safe=${knownNonsense.safe} source=${knownNonsense.source})`
);
const piiDespiteDisagreement = await moderate(
  privacyGuardFalsePositive,
  safeKidnet,
  "kidnet-test",
  "мой номер телефона 5555555"
);
check(
  "possible phone data remains blocked even when a secondary classifier disagrees",
  piiDespiteDisagreement.safe === false && piiDespiteDisagreement.source === "llama-guard",
  `(safe=${piiDespiteDisagreement.safe} source=${piiDespiteDisagreement.source})`
);

// ---- ACCESS: one-time child-access code crypto (pure) ----
console.log("=== ACCESS: one-time code crypto ===");
const { generateCode, normalizeCode, hashAccessValue, hashesEqual, ALPHABET, CODE_LEN } =
  await import("../src/lib/access-code-crypto.ts");
{
  let allLegal = true;
  const seen = new Set();
  for (let i = 0; i < 300; i += 1) {
    const c = generateCode();
    if (c.length !== CODE_LEN || [...c].some((ch) => !ALPHABET.includes(ch)) || /[01OIL]/.test(c)) {
      allLegal = false;
    }
    seen.add(c);
  }
  check("code is 8 chars from the kid-safe alphabet (no 0 O 1 I L)", allLegal);
  check("generateCode is effectively unique across a batch", seen.size > 290, `(unique=${seen.size}/300)`);
}
check("normalizeCode uppercases and strips separators", normalizeCode(" k7p9-qr4t ") === "K7P9QR4T");
{
  const h1 = hashAccessValue("K7P9QR4T", "saltA");
  const h2 = hashAccessValue("K7P9QR4T", "saltA");
  const h3 = hashAccessValue("K7P9QR4T", "saltB");
  check("hash is deterministic for same (value,salt)", h1 === h2 && /^[0-9a-f]{64}$/.test(h1));
  check("hash differs by salt (no cross-salt collision)", h1 !== h3);
  check("hashesEqual is true for equal digests, false otherwise", hashesEqual(h1, h2) && !hashesEqual(h1, h3));
}
check(
  "access-code.ts stores only hashes, never a raw code column",
  (() => {
    const codeSrc = readFileSync(join(root, "src/lib/access-code.ts"), "utf8");
    return codeSrc.includes("hashAccessValue") && !/\bdata:\s*\{[^}]*\bcode:\s/.test(codeSrc);
  })(),
  "access-code.ts must persist only HMAC digests, never a raw code"
);
check(
  "access redeem + activate are declared public API paths",
  isPublicApiPath("/api/access-code/redeem") && isPublicApiPath("/api/access-code/activate"),
  "redeem/activate must bypass Clerk (they have no session yet) but stay rate-limited"
);

// ---- ACCESS: additive parent allowlist (pure, no Clerk import) ----
console.log("=== ACCESS: additive parent allowlist ===");
const parentAllowlist = await import("../src/lib/parent-allowlist.js").catch(() => null);
check(
  "parent allowlist module is available for additive grants",
  parentAllowlist !== null,
  "add a pure parent-allowlist module before wiring it into Clerk access"
);
if (parentAllowlist) {
  const { parentAllowEmailEnvKey, isParentEmailAllowed } = parentAllowlist;
  const yusifKey = parentAllowEmailEnvKey(" YUSIF.GANBAROV@gmail.com ");
  const independentGrant = { NODE_ENV: "production", [yusifKey]: "1" };
  check(
    "per-parent grant is stable across email case and whitespace",
    yusifKey === parentAllowEmailEnvKey("yusif.ganbarov@gmail.com"),
    "the Vercel key must be deterministic for an operator"
  );
  check(
    "per-parent grant allows only the intended normalized email",
    isParentEmailAllowed("yusif.ganbarov@gmail.com", independentGrant) &&
      !isParentEmailAllowed("another.parent@example.com", independentGrant),
    "a grant must never open access to unrelated parents"
  );
  check(
    "production remains closed with no configured parent grants",
    !isParentEmailAllowed("parent@example.com", { NODE_ENV: "production" }),
    "invite-only Academy must fail closed in production"
  );
  check(
    "legacy comma-separated grants remain supported during migration",
    isParentEmailAllowed("legacy.parent@example.com", {
      NODE_ENV: "production",
      ALLOWLIST_EMAILS: "legacy.parent@example.com",
    }),
    "existing approved parents must not lose access"
  );
}
const accessSource = readFileSync(join(root, "src/lib/access.ts"), "utf8");
check(
  "Clerk access gate delegates to the additive parent allowlist policy",
  accessSource.includes("isParentEmailAllowed"),
  "the production Clerk gate must use the independently testable parent policy"
);

// ---- ACCESS: Clerk Backend isolation module (static guard, no live call) ----
{
  const src = readFileSync(join(root, "src/lib/clerk-backend.ts"), "utf8");
  check(
    "clerk-backend uses createClerkClient with CLERK_SECRET_KEY",
    src.includes("createClerkClient(") && src.includes("CLERK_SECRET_KEY")
  );
  check(
    "clerk-backend never console-logs the secret",
    !/console\.\w+\([^)]*secretKey/.test(src)
  );
  check(
    "clerk-backend exposes findOrCreateUserByEmail + mintSignInTicket",
    src.includes("findOrCreateUserByEmail") && src.includes("mintSignInTicket")
  );
}

// ---- GUIDE: escalating idle-nudge + mascot lines (pure) ----
console.log("=== GUIDE: idle-nudge + mascot lines ===");
{
  const { idleNudgeLevel, DEFAULT_NUDGE, mascotLine, MASCOT_LINES } = await import("../src/lib/guide.ts");
  check("no nudge before the first threshold", idleNudgeLevel(0) === 0 && idleNudgeLevel(5999) === 0);
  check("pulse at 6s, voice at 15s, demo at 30s (monotonic escalation)",
    idleNudgeLevel(6000) === 1 && idleNudgeLevel(15000) === 2 && idleNudgeLevel(30000) === 3);
  check("nudge is capped at 3 (never spams past the demo)", idleNudgeLevel(999999) === 3);
  check("custom thresholds are honoured",
    idleNudgeLevel(2000, { pulseMs: 1000, voiceMs: 5000, demoMs: 9000 }) === 1);
  check("thresholds are ordered (pulse < voice < demo)",
    DEFAULT_NUDGE.pulseMs < DEFAULT_NUDGE.voiceMs && DEFAULT_NUDGE.voiceMs < DEFAULT_NUDGE.demoMs);
  check("every mascot beat has a non-empty line", Object.values(MASCOT_LINES).every((l) => l.length > 4));
  check("unknown beat falls back to a safe generic nudge, never empty", mascotLine("nope").length > 4);
}

// ---- totals ----
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("FAILED:", fails.join(", "));
  process.exit(1);
}
console.log("ALL DETERMINISTIC TESTS PASSED ✅");
