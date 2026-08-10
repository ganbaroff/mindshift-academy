#!/usr/bin/env node
/**
 * UX v1.1 — the monster's journey. Pure + static: no network, no Clerk, no Turso.
 *
 * Gates the three shipped steps of docs/architecture/08-UX-MONSTER-JOURNEY.md §7:
 *   step 1 — resume: one computed source of truth for "where am I", no hardcoded w1-s1
 *   step 2 — the task brief: goal / given / done-when, per-session all-or-nothing
 *   step 3 — the re-ask: deterministic, quotes the child, capped at two per task
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SESSION_ORDER,
  COURSE_WEEKS,
  MONSTER_PART_ORDER,
  firstIncompleteSession,
  earnedMonsterParts,
  courseStops,
  weekOfSession,
  sessionNumberOf,
  sessionsOfWeek,
} from "../src/lib/tasks/course-map.ts";
import {
  clarify,
  clarifyMessage,
  MAX_REASKS_PER_TASK,
} from "../src/lib/tasks/clarify.ts";
import {
  isStuckOnTask,
  hintCostFor,
  stuckNoticeRu,
  hintLabelRu,
} from "../src/lib/tasks/stuck.ts";
import { validateSession, hasTaskBrief } from "../src/content/curriculum/validate.ts";
import { week1Session1 } from "../src/content/curriculum/week-1/session-1.ts";
import { week2Session1 } from "../src/content/curriculum/week-2/session-1.ts";

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

console.log("\n=== step 1 · course map is computed, never hardcoded ===");
{
  check("15 sessions in course order", SESSION_ORDER.length === 15);
  check("5 weeks × 3 sessions", [1, 2, 3, 4, 5].every((w) => sessionsOfWeek(w).length === 3));
  check("week parsed from id", weekOfSession("w4-s2") === 4 && weekOfSession("nope") === null);
  check("session parsed from id", sessionNumberOf("w4-s2") === 2);

  check("no progress → first session", firstIncompleteSession([]) === "w1-s1");
  check(
    "resumes after the last completed session, not at the beginning",
    firstIncompleteSession(["w1-s1", "w1-s2", "w1-s3", "w2-s1"]) === "w2-s2"
  );
  check(
    "a gap resumes at the gap, not at the furthest reached",
    firstIncompleteSession(["w1-s1", "w1-s3"]) === "w1-s2"
  );
  check("all fifteen done → null", firstIncompleteSession(SESSION_ORDER) === null);

  const stops = courseStops(["w1-s1", "w1-s2"]);
  check("exactly one current stop", stops.filter((s) => s.state === "current").length === 1);
  check("current stop is the first incomplete", stops.find((s) => s.state === "current")?.sessionId === "w1-s3");
  check("done stops equal completed set", stops.filter((s) => s.state === "done").length === 2);
  check("nothing after the current stop is unlocked", stops.slice(3).every((s) => s.state === "locked"));

  // §1 defect 2: the entry points must not hardcode the first session again.
  const onboarding = readFileSync(join(root, "src/app/onboarding/page.tsx"), "utf8");
  const dashboard = readFileSync(join(root, "src/app/dashboard/page.tsx"), "utf8");
  const continuePage = readFileSync(join(root, "src/app/continue/page.tsx"), "utf8");
  check("onboarding sends the child to /continue", onboarding.includes('router.push("/continue")'));
  check("onboarding no longer hardcodes w1-s1", !onboarding.includes('router.push("/session/w1-s1")'));
  check("dashboard CTA points at /continue", dashboard.includes('href="/continue"'));
  check(
    "/continue resolves the position instead of guessing",
    continuePage.includes("resolveFirstIncompleteSession")
  );
  const apiContinue = readFileSync(join(root, "src/app/api/continue/route.ts"), "utf8");
  check(
    "/api/continue shares the same resolver (one source of truth)",
    apiContinue.includes("resolveFirstIncompleteSession") && !apiContinue.includes("const SESSION_ORDER")
  );
}

console.log("\n=== step 1b · monster growth is one part per completed week ===");
{
  check("five parts, fixed order", MONSTER_PART_ORDER.length === 5 && MONSTER_PART_ORDER[0] === "ears");
  check("weeks map onto parts in order", COURSE_WEEKS.map((w) => w.part).join() === MONSTER_PART_ORDER.join());
  check("no week finished → no parts", earnedMonsterParts(["w1-s1", "w1-s2"]).length === 0);
  check("week 1 finished → ears", earnedMonsterParts(["w1-s1", "w1-s2", "w1-s3"]).join() === "ears");
  check(
    "a later week alone awards nothing (growth is outward, never rearranged)",
    earnedMonsterParts(["w3-s1", "w3-s2", "w3-s3"]).length === 0
  );
  check("all fifteen → all five parts", earnedMonsterParts(SESSION_ORDER).length === 5);
  check("every week names what its part means", COURSE_WEEKS.every((w) => w.partMeaningRu.trim().length > 0));
}

console.log("\n=== step 2 · the task brief (§2, rendered per §10.2) ===");
{
  const sandwich = week2Session1.tasks.find((t) => t.id === "w2s1-collision");
  check("the sandwich task carries a brief", hasTaskBrief(sandwich));
  check(
    "the ambiguous original prompt is gone",
    !JSON.stringify(week2Session1).includes("в любом порядке — попробуй")
  );
  check("goal names the finished thing", sandwich.goalRu === "собрать сэндвич из того, что лежит на столе");
  check("given is an explicit list", sandwich.givenRu.join(", ") === "хлеб, сыр, масло, нож");
  check("done-when is one short line in the monster's voice", sandwich.doneWhenRu.length <= 60);
  check("the full condition exists for the after-a-miss expansion", sandwich.doneWhenFullRu.length > 0);
  check("no «и т.д.» in any given list", !JSON.stringify(week2Session1).includes("и т.д"));

  check("week 1 session 1 is fully briefed", week1Session1.tasks.every(hasTaskBrief));
  check("week 2 session 1 is fully briefed", week2Session1.tasks.every(hasTaskBrief));
  check("briefed sessions validate clean", validateSession(week1Session1).length === 0 && validateSession(week2Session1).length === 0);

  // The migration gate: half-briefing a session must fail loudly.
  const halfBriefed = {
    ...week2Session1,
    tasks: week2Session1.tasks.map((t, i) =>
      i === 0 ? t : { ...t, goalRu: undefined, givenRu: undefined, doneWhenRu: undefined, doneWhenFullRu: undefined }
    ),
  };
  const issues = validateSession(halfBriefed);
  check("a half-briefed session is rejected", issues.length === week2Session1.tasks.length - 1, `${issues.length} issues`);
  check("the rejection names the missing fields", issues[0]?.message.includes("goalRu"));

  // Unbriefed sessions stay legal until they are backfilled.
  const unbriefed = {
    ...week2Session1,
    tasks: week2Session1.tasks.map((t) => ({
      ...t,
      goalRu: undefined,
      givenRu: undefined,
      doneWhenRu: undefined,
      doneWhenFullRu: undefined,
    })),
  };
  check("an untouched session is still valid mid-migration", validateSession(unbriefed).length === 0);
}

console.log("\n=== step 3 · the re-ask is deterministic and quotes the child ===");
{
  const given = ["хлеб", "сыр", "масло", "нож"];
  const seq = (utterance, reasksUsed = 0) =>
    clarify({ utterance, family: "sequence-world", given, reasksUsed });

  // Fires — real ambiguity, from the brief's own examples.
  const verbOnly = seq("намажь");
  check("verb with no object asks back", verbOnly?.code === "verb_without_object");
  check("it quotes the child's own word", clarifyMessage(verbOnly).includes("«намажь»"));
  check("and says it is not a mistake", !clarifyMessage(verbOnly).includes("неправильно"));

  check("things with no action ask back", seq("хлеб и сыр")?.code === "object_without_verb");
  check("a dangling pronoun asks back", seq("положи его на тарелку")?.code === "dangling_pronoun");
  check("only filler asks back", seq("ну вот")?.code === "too_few_words");
  check(
    "saying order does not matter, on a task that grades order, asks back",
    seq("взять хлеб и намазать масло в любом порядке")?.code === "order_unspecified"
  );
  check(
    "two actions joined only by «и» ask back",
    seq("намазать хлеб и положить сыр")?.code === "order_unspecified"
  );

  // Stays quiet — a nag is worse than a miss.
  check("a comma-separated plan is already an order", seq("взять хлеб, намазать маслом, положить сыр") === null);
  check("a numbered plan is already an order", seq("1) взять хлеб 2) намазать маслом") === null);
  check(
    "ordering words are proof of intent",
    seq("сначала взять хлеб потом намазать маслом") === null
  );
  check(
    "a pronoun with something to point at is fine",
    seq("взять хлеб и намазать его маслом, потом положить сыр") === null
  );
  check("empty input never re-asks (the check button is disabled)", seq("") === null);
  check(
    "order rules do not apply where order is not graded",
    clarify({
      utterance: "закрасить верхний ряд и левый столбец",
      family: "grid-draw",
      given: week1Session1.tasks[0].givenRu,
      reasksUsed: 0,
    }) === null
  );
  check(
    "a child who wrote a real sentence is graded, not interrogated",
    seq("положить на стол всё что нужно для завтрака сверху") === null
  );

  // The cap and the escalation.
  check("at most two re-asks per task", MAX_REASKS_PER_TASK === 2);
  check("the cap is enforced", seq("намажь", MAX_REASKS_PER_TASK) === null);
  const second = seq("намажь", 1);
  check("the second re-ask switches to confirmation", second?.stage === "confirm");
  check("confirmation says what the monster would do", clarifyMessage(second).includes("так?"));

  // Determinism: same input, same output, every time.
  const runs = new Set(
    Array.from({ length: 20 }, () => JSON.stringify(seq("намажь")))
  );
  check("identical every time", runs.size === 1);

  // Banned lexicon: nothing the monster says may shame the child.
  const banned = ["неправильно", "ошиб", "провал", "ты не смог", "плохо"];
  const codes = ["verb_without_object", "object_without_verb", "order_unspecified", "dangling_pronoun", "too_few_words"];
  const everyMessage = codes.flatMap((code) =>
    ["ask", "confirm"].map((stage) => clarifyMessage({ code, quote: "намажь", stage }))
  );
  check(
    "no shaming word in any re-ask copy",
    everyMessage.every((m) => !banned.some((b) => m.toLowerCase().includes(b))),
    everyMessage.find((m) => banned.some((b) => m.toLowerCase().includes(b)))
  );
  check("every code renders copy", everyMessage.every((m) => typeof m === "string" && m.length > 0));
}

console.log("\n=== §10.1 · the stuck child is helped, not watched ===");
{
  check("nothing happens on a first miss", !isStuckOnTask(1) && stuckNoticeRu(1) === null);
  check("help arrives on the second", isStuckOnTask(2) && stuckNoticeRu(2) !== null);
  check("the hint costs full price before that", hintCostFor(1, 5) === 5);
  check("and nothing once stuck", hintCostFor(2, 5) === 0 && hintCostFor(4, 5) === 0);
  check("the label tells the child the price changed", hintLabelRu(2, 5) === "бесплатно" && hintLabelRu(0, 5) === "5💎");
  check("the third miss offers to show what the monster would do", /что бы сделал сам/.test(stuckNoticeRu(3)));
  check("the fourth offers leaving without loss language", /вернуться сюда позже/.test(stuckNoticeRu(4)));
  const notices = [2, 3, 4, 7].map((n) => stuckNoticeRu(n));
  const shaming = ["неправильно", "ошиб", "провал", "не смог", "плохо", "потеряешь"];
  check(
    "no shaming and no loss language in any notice",
    notices.every((m) => !shaming.some((b) => m.toLowerCase().includes(b)))
  );
  check("no notice asks the child whether they are struggling", notices.every((m) => !m.includes("?") || !/трудно|застрял|помощь нужна/i.test(m)));

  // The price is a server decision. A client that says "I am stuck" must not be believed.
  const hintRoute = readFileSync(join(root, "src/app/api/hints/reveal/route.ts"), "utf8");
  check("the route counts recorded misses itself", hintRoute.includes("prisma.taskAttempt.count"));
  check("and derives the price from them", hintRoute.includes("hintCostFor(failedAttempts, HINT_CRYSTAL_COST)"));
  check(
    "the free unlock still goes through the idempotent ledger",
    hintRoute.includes("spendCrystalsForHint") && hintRoute.includes("cost,")
  );
  check("no stuck flag is accepted from the request body", !/bodySchema[\s\S]{0,200}stuck/i.test(hintRoute));
  check("with the gate off the price is exactly what it is today", hintRoute.includes("uxV11Enabled()") && hintRoute.includes(": 0;"));
}

console.log("\n=== §6 · the new mechanics stay behind the gate until e2e covers them ===");
{
  const flags = readFileSync(join(root, "src/lib/ux-flags.ts"), "utf8");
  check("the gate is off unless explicitly set", flags.includes('process.env.NEXT_PUBLIC_UX_V11 === "1"'));

  const page = readFileSync(join(root, "src/app/session/[id]/page.tsx"), "utf8");
  check("the re-ask is gated", /uxV11Enabled\(\) && opts\.utterance/.test(page));
  check("the stuck offer is gated", /uxV11Enabled\(\) && isStuckOnTask/.test(page));

  // Deliberately NOT gated — a bug fix and a content-driven render.
  const continuePage = readFileSync(join(root, "src/app/continue/page.tsx"), "utf8");
  check("the resume fix is not hidden behind a design flag", !continuePage.includes("uxV11Enabled"));
  const workspace = readFileSync(join(root, "src/components/curriculum/task-surfaces/TaskWorkspace.tsx"), "utf8");
  check("the brief is gated by content, not by a flag", !workspace.includes("uxV11Enabled"));

  // §7 step 6's precondition, now met: the current /session route is driven in a real
  // browser both in the release gate and in CI. Before this, CI ran unit tests and a
  // build only, and verify:release drove the legacy /lesson route.
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  check("the browser gate exists", Boolean(pkg.scripts["test:e2e:current-sessions"]));
  check(
    "verify:release drives the current session route",
    pkg.scripts["verify:release"].includes("test:e2e:current-sessions")
  );
  const ci = readFileSync(join(root, ".github/workflows/atlas-learning-ci.yml"), "utf8");
  check("CI runs it too", ci.includes("npm run test:e2e:current-sessions"));
  check("CI installs the browsers it needs", ci.includes("playwright install"));
  // BLOCKED must never be able to read as a pass, and must never look like a failure.
  check("CI distinguishes BLOCKED from a real failure", /code" -eq 2|code" = "2/.test(ci) && ci.includes("::warning"));
  check("and says so in the job summary rather than staying silent", ci.includes("GITHUB_STEP_SUMMARY"));
  check("a real failure still fails the job", ci.includes("exit $code"));
  check(
    "the gate is still not claimed as met while it cannot run",
    ci.includes("certified nothing")
  );

  const suite = readFileSync(join(root, "tests/e2e/current-session-ui.mjs"), "utf8");
  check(
    "the gate certifies the screen with v1.1 on, not the old one",
    suite.includes('NEXT_PUBLIC_UX_V11: "1"')
  );
  check("and drives the re-ask itself", suite.includes("assertReaskFlow"));
  check(
    "asserting a re-ask is not recorded as an attempt",
    /Пропустить[\s\S]{0,200}a re-ask must not be recorded as a failed attempt/.test(suite)
  );
}

console.log("\n=== the session screen wires it as specified ===");
{
  const page = readFileSync(join(root, "src/app/session/[id]/page.tsx"), "utf8");
  const clarifyCall = page.indexOf("clarify({");
  const fetchCall = page.indexOf('fetch("/api/tasks/attempt"');
  check("clarify runs before anything is recorded", clarifyCall > 0 && clarifyCall < fetchCall);
  check("a re-ask returns without calling the attempt API", /setReask\(question\);[\s\S]{0,120}return;/.test(page));
  check("the re-ask budget resets per task", page.includes("setReasksUsed(0)"));
  check("the miss streak resets per task", page.includes("setFailStreak(0)"));

  const feedbackAt = page.indexOf('data-testid="task-done-when-full"');
  const reaskAt = page.indexOf('data-testid="monster-reask"');
  check("the re-ask renders under the feedback, not in place of it", feedbackAt > 0 && reaskAt > feedbackAt);
  check("the workspace shows what is given", page.includes("task-given") || readFileSync(join(root, "src/components/curriculum/task-surfaces/TaskWorkspace.tsx"), "utf8").includes("task-given"));

  const workspace = readFileSync(join(root, "src/components/curriculum/task-surfaces/TaskWorkspace.tsx"), "utf8");
  check("the goal replaces the prompt line when a task is briefed", workspace.includes("task.goalRu ?? task.promptRu"));
  check("«готово, когда» is visible before the first attempt", page.includes('data-testid="task-done-when"'));
  check("the full condition only expands after a miss", /failStreak > 0 && currentTask\?\.doneWhenFullRu/.test(page));
  check("the stuck child gets no modal", !/Modal|Dialog/.test(page.slice(page.indexOf("stuck-notice") - 400, page.indexOf("stuck-notice") + 400)));
}

console.log(
  `\n${fail === 0 ? "UX V1.1 MONSTER JOURNEY: all passed" : `UX V1.1 MONSTER JOURNEY: ${fail} FAILED`} (${pass} passed)\n`
);
process.exit(fail === 0 ? 0 : 1);
