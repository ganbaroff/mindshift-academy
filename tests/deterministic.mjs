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
import { readFileSync } from "node:fs";
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
const { academyEntryRedirect } = await import("../src/lib/academy-access.ts");
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
const { isCurrentValidConsent } = await import("../src/lib/consent-policy.ts");
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
    consentVersion: "2026-06-28",
  },
  {
    clerkId: "parent_revoked",
    parentEmail: "revoked.parent@example.com",
    verifiedAt: new Date("2026-07-18T00:00:00Z"),
    revokedAt: new Date("2026-07-18T01:00:00Z"),
    serviceConsent: true,
    externalAiConsent: true,
    consentVersion: "2026-06-28",
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
    consentVersion: "2026-06-28",
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
const { moderate } = await import("../src/lib/moderation.ts");
const throwing = { chat: { completions: { create: async () => { throw new Error("simulated outage"); } } } };
const r = await moderate(throwing, throwing, "gemini-2.5-flash", "любой безобидный текст");
check(
  "classifier outage -> fail-closed BLOCK",
  r.safe === false && r.source === "fail-closed",
  `(safe=${r.safe} source=${r.source})`
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

// ---- totals ----
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log("FAILED:", fails.join(", "));
  process.exit(1);
}
console.log("ALL DETERMINISTIC TESTS PASSED ✅");
