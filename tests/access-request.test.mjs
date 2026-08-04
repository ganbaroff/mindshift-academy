#!/usr/bin/env node
/**
 * Public pilot-access request funnel: validation, anti-abuse posture, privacy posture.
 * Pure + source-level assertions only — no network, no database.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const {
  normalizeRequestEmail,
  clampText,
  parseAccessRequest,
  operatorAlertText,
  maskEmail,
  ACCESS_REQUEST_LIMITS,
} = await import("../src/lib/access-requests.ts");
const { telegramAlertConfigured, sendTelegramAlert } = await import("../src/lib/notify-telegram.ts");
const { isPublicApiPath } = await import("../src/lib/request-access.ts");
const { findBannedLexicon } = await import("../src/lib/banned-lexicon.ts");
const { findMojibake } = await import("../src/lib/mojibake.ts");

let failed = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${condition || !detail ? "" : ` — ${detail}`}`);
  if (!condition) failed += 1;
}

// --- email normalisation -----------------------------------------------------------------
check("email is lowercased and trimmed", normalizeRequestEmail("  Parent@Example.COM ") === "parent@example.com");
check("email without a dotted domain is rejected", normalizeRequestEmail("parent@localhost") === null);
check("email without @ is rejected", normalizeRequestEmail("parent.example.com") === null);
check("empty email is rejected", normalizeRequestEmail("   ") === null);
check("non-string email is rejected", normalizeRequestEmail(42) === null);
check(
  "over-long email is rejected before it reaches the database",
  normalizeRequestEmail(`${"a".repeat(ACCESS_REQUEST_LIMITS.email)}@example.com`) === null
);

// --- free text ---------------------------------------------------------------------------
check("note whitespace/newlines collapse", clampText("  два\n\nслова  ", 300) === "два слова");
check("note is hard-capped", clampText("x".repeat(500), ACCESS_REQUEST_LIMITS.note)?.length === ACCESS_REQUEST_LIMITS.note);
check("blank note becomes null, not an empty row value", clampText("   ", 300) === null);

// --- submission parsing ------------------------------------------------------------------
const good = parseAccessRequest({ email: "Parent@Example.com", parentName: " Айгюн ", note: " вопрос " });
check("valid submission parses", good.ok === true);
check("valid submission normalises every field", good.ok && good.value.email === "parent@example.com" && good.value.parentName === "Айгюн" && good.value.note === "вопрос");
const bot = parseAccessRequest({ email: "parent@example.com", website: "http://spam" });
check("honeypot submission is refused", bot.ok === false && bot.reason === "bot");
const badEmail = parseAccessRequest({ email: "nope" });
check("bad email is refused", badEmail.ok === false && badEmail.reason === "email");
const noChildFields = parseAccessRequest({ email: "parent@example.com", childName: "Тимур", childAge: 9 });
check(
  "unknown child fields are dropped, never persisted",
  noChildFields.ok === true && !("childName" in noChildFields.value) && !("childAge" in noChildFields.value)
);

// --- operator alert ----------------------------------------------------------------------
const alert = operatorAlertText({ email: "parent@example.com", parentName: "Айгюн", note: "хотим попробовать" }, "https://academy.volaura.app");
check("alert carries the address the operator needs", alert.includes("parent@example.com"));
check("alert carries the one-command approval", alert.includes('scripts/approve-access-request.mjs "parent@example.com"'));
check("alert has no mojibake", findMojibake(alert).length === 0, findMojibake(alert).join(","));
check("masked email hides the local part in logs", maskEmail("parent@example.com") === "pa***@example.com");

// --- telegram transport ------------------------------------------------------------------
check("telegram alert is off when unconfigured", telegramAlertConfigured({}) === false);
check(
  "telegram alert is on with both variables",
  telegramAlertConfigured({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_ALERT_CHAT_ID: "-100" }) === true
);
check("unconfigured send is a silent no-op (no fetch)", (await sendTelegramAlert("x", {})) === false);
const notifySource = read("src/lib/notify-telegram.ts");
check("token is never logged", !/console\.(log|error|warn)\([^)]*token/i.test(notifySource));
check("alert cannot throw into the request path", notifySource.includes("catch"));

// --- request boundary --------------------------------------------------------------------
check("request endpoint is public (the parent has no account yet)", isPublicApiPath("/api/access-request"));
const routeSource = read("src/app/api/access-request/route.ts");
check("endpoint fails closed without a distributed limiter", routeSource.includes("rateLimitMisconfiguredInProd"));
check("endpoint refuses anonymous traffic with no trusted client key", routeSource.includes("publicClientKey"));
check("endpoint is rate limited", /rateLimit\("access-request"/.test(routeSource));
check("repeat submissions do not re-alert", routeSource.includes("findUnique") && routeSource.includes("existing"));
check("logs carry a masked address only", routeSource.includes("maskEmail"));
check("route source has no mojibake", findMojibake(routeSource).length === 0);

// --- page posture ------------------------------------------------------------------------
const pageSource = read("src/app/request-access/page.tsx");
check("form warns against sending child data", pageSource.includes("не указывайте данные ребёнка"));
check("form has the bot honeypot", pageSource.includes("website"));
check("page copy avoids the banned lexicon", findBannedLexicon(pageSource).length === 0, findBannedLexicon(pageSource).join(","));
check("page has no mojibake", findMojibake(pageSource).length === 0);
check("closed-door page offers the request route", read("src/app/no-access/page.tsx").includes("/request-access"));
check("home page offers the request route", read("src/app/page.tsx").includes("/request-access"));

// --- audit hardening (2026-08-03) --------------------------------------------------------
check(
  "email validator rejects shell metacharacters in the local part",
  normalizeRequestEmail("x;whoami@a.bc") === null && normalizeRequestEmail("a$(id)b@a.bc") === null
);
check("ordinary addresses still pass", normalizeRequestEmail("first.last+tag@sub-domain.co.uk") === "first.last+tag@sub-domain.co.uk");
check(
  "operator command quotes the address",
  operatorAlertText({ email: "parent@example.com", parentName: null, note: null }).includes('approve-access-request.mjs "parent@example.com"')
);
check(
  "operator alert runs after the response, so latency cannot leak who already asked",
  routeSource.includes("after(") && routeSource.includes('from "next/server"')
);
const notifySource2 = read("src/lib/notify-operator.ts");
check(
  "alert falls back to email while Telegram has no chat id",
  notifySource2.includes("telegramAlertConfigured") && notifySource2.includes("resend.emails.send")
);
check("alert never throws into the request path", notifySource2.includes("catch"));
check(
  "route asks the operator notifier, not one hardcoded channel",
  routeSource.includes("notifyOperator") && !routeSource.includes("sendTelegramAlert")
);
const { requirePepper } = await import("../src/lib/access-code-crypto.ts");
let pepperThrew = false;
try {
  requirePepper({ NODE_ENV: "production" });
} catch {
  pepperThrew = true;
}
check("missing pepper fails loudly in production instead of silently weakening hashes", pepperThrew);
check("pepper is optional in development", requirePepper({ NODE_ENV: "development" }) === "");
check("configured pepper is returned unchanged", requirePepper({ NODE_ENV: "production", CONSENT_CODE_PEPPER: "p" }) === "p");
const formulationSource = read("src/app/api/formulation/submit/route.ts");
check(
  "formulation submit throttles its paid classifier call",
  /rateLimit\("formulation-submit"/.test(formulationSource) && formulationSource.includes("rateLimitMisconfiguredInProd")
);
check("build provenance endpoint is public", isPublicApiPath("/api/version"));
check(
  "activation link cannot leak its token through the referrer",
  read("next.config.ts").includes('source: "/activate"') && read("next.config.ts").includes("no-referrer")
);

// --- storage shape -----------------------------------------------------------------------
const schema = read("prisma/schema.prisma");
check("AccessRequest model exists", schema.includes("model AccessRequest"));
check("request email is unique (idempotent inbox)", /model AccessRequest[\s\S]*?email\s+String\s+@unique/.test(schema));
const migration = read("prisma/migrations/0003_w6_access_request/migration.sql");
// Statements only — the header comment legitimately spells out the "never drop" rule.
const migrationSql = migration
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
check(
  "migration is additive-only",
  !/\bDROP\b/i.test(migrationSql) && !/ALTER TABLE/i.test(migrationSql),
  migrationSql.match(/\b(DROP|ALTER TABLE)\b/i)?.[0]
);
check("migration is idempotent", (migration.match(/IF NOT EXISTS/g) ?? []).length >= 3);

// --- operator path -----------------------------------------------------------------------
const approveSource = read("scripts/approve-access-request.mjs");
check("approval prints the allowlist variable name", approveSource.includes("parentAllowEmailEnvKey"));
check("production config changes need an explicit flag", approveSource.includes("--grant") && approveSource.includes("doGrant"));
check("credential issuing needs an explicit flag", approveSource.includes("--issue-code") && approveSource.includes("doCode"));
const generateSource = read("scripts/generate-access-codes.mjs");
check(
  "code generator honours per-parent grants, not just the legacy bulk list",
  generateSource.includes("isParentEmailAllowed") && !/ALLOWLIST_EMAILS\s*\?\?/.test(generateSource)
);

if (failed > 0) {
  console.error(`\n${failed} access-request assertion(s) failed`);
  process.exit(1);
}
console.log("\nALL ACCESS-REQUEST ASSERTIONS PASSED");
