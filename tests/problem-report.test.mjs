#!/usr/bin/env node
/**
 * The pilot's feedback loop. Pure + static: no network, no Clerk, no database.
 *
 * The property this file exists to defend: a CHILD screen can never forward free text,
 * and that is decided by the server from the path, not by the button.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifySurface,
  noteAllowed,
  sanitizeReportPath,
  sanitizeNote,
  buildProblemReport,
  PROBLEM_REPORT_MAX_NOTE,
  PROBLEM_REPORT_MAX_PATH,
} from "../src/lib/problem-report.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n=== which screen is this ===");
{
  for (const p of ["/session/w2-s1", "/lesson/3", "/onboarding", "/enter-code", "/certificate", "/start"]) {
    check(`${p} is a child screen`, classifySurface(p) === "child");
  }
  for (const p of ["/dashboard", "/consent", "/parent-rights", "/request-access", "/privacy", "/"]) {
    check(`${p} is a parent screen`, classifySurface(p) === "parent");
  }
  check("a query string cannot change the verdict", classifySurface("/session/w1-s1?parent=1") === "child");
  check("nor can a fragment", classifySurface("/session/w1-s1#/dashboard") === "child");
  check("a lookalike prefix is not a child screen", classifySurface("/sessions-report") === "parent");
}

console.log("\n=== what may leave the device ===");
{
  check("a parent may type", noteAllowed("parent"));
  check("a child may not", !noteAllowed("child"));

  const fromChild = buildProblemReport({
    path: "/session/w2-s1",
    note: "меня зовут Аня, мне 9, мой телефон 055...",
    reporterEmail: "parent@example.com",
  });
  check("a child screen sends no note at all", fromChild.note === "");
  check("and the report says so, instead of pretending nothing was typed", fromChild.noteDropped);
  check("no child text survives anywhere in the message", !fromChild.text.includes("Аня") && !fromChild.text.includes("055"));
  check("the screen still reaches the operator", fromChild.text.includes("/session/w2-s1"));

  const fromParent = buildProblemReport({
    path: "/dashboard",
    note: "кнопка Продолжить ведёт не туда",
    reporterEmail: "parent@example.com",
  });
  check("a parent's note is carried", fromParent.text.includes("кнопка Продолжить ведёт не туда"));
  check("with a way to answer them", fromParent.text.includes("parent@example.com"));
  check("nothing is dropped silently", !fromParent.noteDropped);

  const anonymous = buildProblemReport({ path: "/session/w1-s1" });
  check("a report without an email still sends", anonymous.text.includes("/session/w1-s1"));
  check("and invents no sender", !anonymous.text.includes("от:"));
}

console.log("\n=== sanitising ===");
{
  check("query strings are dropped whole", sanitizeReportPath("/dashboard?token=abc123") === "/dashboard");
  check("a path is capped", sanitizeReportPath(`/${"a".repeat(400)}`).length <= PROBLEM_REPORT_MAX_PATH);
  check("a relative path is normalised", sanitizeReportPath("dashboard") === "/dashboard");
  check("an empty path is still a path", sanitizeReportPath("") === "/");
  check("no scheme or host survives", !sanitizeReportPath("https://evil.example/x").includes(":"));

  check("a note is capped", sanitizeNote("б".repeat(900)).length === PROBLEM_REPORT_MAX_NOTE);
  check("newlines collapse", sanitizeNote("одна\nдве\n\nтри") === "одна две три");
  const withControls = sanitizeNote("a" + String.fromCharCode(0,9,27,127) + "bc");
  check("control characters do not survive", ![...withControls].some((c)=>{const n=c.codePointAt(0);return n<32||n===127;}), JSON.stringify(withControls));
  check("an absent note is empty, not undefined", sanitizeNote(undefined) === "");
}

console.log("\n=== the route enforces it, not the button ===");
{
  const route = readFileSync(join(root, "src/app/api/report-problem/route.ts"), "utf8");
  check("the server decides the surface", route.includes("buildProblemReport"));
  check("it does not trust a surface sent by the client", !/surface:\s*parsed\.data/.test(route));
  check("sign-in is required", route.includes('status: 401'));
  check("it is rate limited", route.includes('rateLimit("report-problem"'));
  check("it fails closed if the limiter is missing in prod", route.includes("rateLimitMisconfiguredInProd"));
  check("nothing is written to the database", !route.includes("prisma"));

  const button = readFileSync(join(root, "src/components/support/ReportProblemButton.tsx"), "utf8");
  check("the button offers typing only where it is allowed", button.includes("noteAllowed"));
  check("one tap is a whole report on a child screen", /canType \? setPhase\("open"\) : void send\(""\)/.test(button));
  // Reset happens during render, not in an effect: an effect lets the stale note render
  // once on the new screen before it is cleared.
  check("state is stamped with the screen it belongs to", button.includes("state.path === pathname"));
  check("a half-typed note never crosses to another screen", !button.includes("useEffect"));
  check("touch target is at least 44px", button.includes("min-h-11") && button.includes("min-w-11"));

  const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");
  check("it is mounted on every page", layout.includes("<ReportProblemButton />"));
  // Never gated on client-side auth state: a child mid-session whose Clerk client has
  // not hydrated still needs the loop. The server answers 401 and the button says where
  // to write instead, rather than vanishing or faking success.
  check("the button is not hidden by client auth state", !button.includes("useAuth"));
  check("a signed-out tap is answered honestly", button.includes('res.status === 401 ? "anonymous"'));
  check("and points somewhere real", button.includes("report-problem-anonymous"));
}

console.log(
  `\n${fail === 0 ? "PROBLEM REPORT: all passed" : `PROBLEM REPORT: ${fail} FAILED`} (${pass} passed)\n`
);
process.exit(fail === 0 ? 0 : 1);
