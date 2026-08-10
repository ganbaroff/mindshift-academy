#!/usr/bin/env node
/**
 * Family invitation letter + printable start guide.
 * Pure rendering assertions — no network, no database, no real credentials.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const { inviteText, inviteHtml, formatCode, sendFamilyInvite, INVITE_SUBJECT } = await import(
  "../src/lib/family-invite-email.ts"
);
const { findBannedLexicon } = await import("../src/lib/banned-lexicon.ts");
const { findMojibake } = await import("../src/lib/mojibake.ts");

let failed = 0;
function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${condition || !detail ? "" : ` — ${detail}`}`);
  if (!condition) failed += 1;
}

const invite = {
  to: "parent@example.com",
  activationToken: "TESTTOKEN-abc123",
  code: "ABCD2345",
  parentName: "Айгюн",
  appUrl: "https://academy.volaura.app",
};
const html = inviteHtml(invite);
const text = inviteText(invite);

check("code is split into two readable halves", formatCode("ABCD2345") === "ABCD 2345");
check("subject is set", INVITE_SUBJECT.length > 10 && INVITE_SUBJECT.includes("MindShift"));

check("html carries the personal activation link", html.includes("/activate?t=TESTTOKEN-abc123"));
check("html carries the child code", html.includes("ABCD 2345"));
check("html points at the code-entry page", html.includes("/enter-code"));
check("html links the printable guide", html.includes("/start"));
check("html links privacy and parent rights", html.includes("/privacy") && html.includes("/parent-rights"));
check("html warns the link is single-use", html.includes("одноразовая"));
check("plain-text alternative exists for every part", text.includes("/activate?t=TESTTOKEN-abc123") && text.includes("ABCD 2345"));
check("no script tag in the letter", !/<script/i.test(html));
check("styles are inline (mail clients drop stylesheets)", !/<style[\s>]/i.test(html) && html.includes("style=\""));
check("letter avoids the banned lexicon", findBannedLexicon(html).length === 0, findBannedLexicon(html).join(","));
check("letter has no mojibake", findMojibake(text).length === 0);
check("letter says nothing about the child personally", !/ребёнка зовут|имя ребёнка|возраст ребёнка/i.test(text));

const unsentKey = process.env.RESEND_API_KEY;
delete process.env.RESEND_API_KEY;
const result = await sendFamilyInvite(invite);
check("unconfigured send reports a reason instead of throwing", result.sent === false && result.reason === "no_api_key");
if (unsentKey) process.env.RESEND_API_KEY = unsentKey;

const guide = read("src/app/start/page.tsx");
check("start guide exists with three steps", /Шаг 1/.test(guide) && /Шаг 2/.test(guide) && /Шаг 3/.test(guide));
check("start guide holds no credential and no personal data", !/activate\?t=/.test(guide) && !/@gmail/.test(guide));
check("start guide says where the code comes from", guide.includes("письмом"));
check("start guide offers the request route for families without a letter", guide.includes("/request-access"));
check("start guide avoids the banned lexicon", findBannedLexicon(guide).length === 0, findBannedLexicon(guide).join(","));
check("start guide has no mojibake", findMojibake(guide).length === 0);

const sender = read("scripts/send-family-invite.mjs");
check("send script defaults to preview, never auto-sends", sender.includes('doSend = args.includes("--send")') && sender.includes("preview only"));
check("send script refuses the sandbox sender for real families", sender.includes("ABORT: RESEND_FROM is not set"));
check("send script masks addresses in its output", sender.includes("const mask ="));
check("credential files stay out of git", read(".gitignore").includes("family-codes-") && read(".gitignore").includes("invite-preview-"));

if (failed > 0) {
  console.error(`\n${failed} family-invite assertion(s) failed`);
  process.exit(1);
}
console.log("\nALL FAMILY-INVITE ASSERTIONS PASSED");
