#!/usr/bin/env node
/**
 * W2 learner-state gates — pure + static. No network, no live Clerk, no Turso.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveResumeFromAttempts,
  selectOfferedTier,
  effectiveTaskTier,
  tierForMastery,
} from "../src/lib/tasks/index.ts";
import { signedInContinuePath, academyEntryRedirect } from "../src/lib/academy-access.ts";
import { dayBucket, mintOpaqueSessionId } from "../src/lib/degrade-events.ts";
import { week1Session1 } from "../src/content/curriculum/week-1/session-1.ts";

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

console.log("\n=== signed-in continue path ===");
{
  check(
    "signed-out → null",
    signedInContinuePath({
      signedIn: false,
      allowed: true,
      consentValid: true,
      hasMonster: true,
      nextSessionId: "w1-s1",
    }) === null
  );
  check(
    "signed-in no consent → /consent",
    signedInContinuePath({
      signedIn: true,
      allowed: true,
      consentValid: false,
      hasMonster: true,
      nextSessionId: "w1-s1",
    })?.href === "/consent"
  );
  check(
    "signed-in ready → session continue",
    signedInContinuePath({
      signedIn: true,
      allowed: true,
      consentValid: true,
      hasMonster: true,
      nextSessionId: "w2-s1",
    })?.href === "/session/w2-s1"
  );
  check(
    "signed-in no monster → onboarding",
    signedInContinuePath({
      signedIn: true,
      allowed: true,
      consentValid: true,
      hasMonster: false,
      nextSessionId: "w1-s1",
    })?.href === "/onboarding"
  );
  check(
    "landing pages import SignedInContinue",
    readFileSync(join(root, "src/app/page.tsx"), "utf8").includes("SignedInContinue") &&
      readFileSync(join(root, "src/app/enter-code/page.tsx"), "utf8").includes("SignedInContinue")
  );
  check(
    "enter-code replaces form when signed in",
    readFileSync(join(root, "src/app/enter-code/page.tsx"), "utf8").includes("replace-form")
  );
  void academyEntryRedirect;
}

console.log("\n=== resume derivation (refresh mid-session) ===");
{
  const tasks = week1Session1.tasks;
  const mid = deriveResumeFromAttempts(
    tasks,
    [
      { taskId: tasks[0].id, pass: true, tier: 1 },
      { taskId: tasks[1].id, pass: true, tier: 1 },
    ],
    1
  );
  check("two passes → taskIndex 2", mid.taskIndex === 2, String(mid.taskIndex));
  check("passedTaskIds length 2", mid.passedTaskIds.length === 2);
  const empty = deriveResumeFromAttempts(tasks, [], 1);
  check("no attempts → index 0", empty.taskIndex === 0);
  const failOnly = deriveResumeFromAttempts(
    tasks,
    [{ taskId: tasks[0].id, pass: false, tier: 1 }],
    1
  );
  check("fail does not advance", failOnly.taskIndex === 0 && failOnly.passedTaskIds.length === 0);
}

console.log("\n=== mastery-tier selection wired ===");
{
  check("tierForMastery low → 1", tierForMastery(0.1) === 1);
  check("tierForMastery mid → 2", tierForMastery(0.5) === 2);
  check("tierForMastery high → 3", tierForMastery(0.9) === 3);
  check("selectOfferedTier delegates", selectOfferedTier(0.5) === 2);
  check(
    "practice uses max(authored, offered)",
    effectiveTaskTier(1, 3, "practice") === 3
  );
  check(
    "collision keeps authored",
    effectiveTaskTier(2, 1, "collision") === 2
  );
  const attemptSrc = readFileSync(join(root, "src/app/api/tasks/attempt/route.ts"), "utf8");
  const sessionSrc = readFileSync(join(root, "src/app/api/tasks/session/[id]/route.ts"), "utf8");
  check("attempt route calls selectOfferedTier", attemptSrc.includes("selectOfferedTier"));
  check("session route returns offeredTier", sessionSrc.includes("offeredTier"));
}

console.log("\n=== consent revoke calm screen ===");
{
  const sessionUi = readFileSync(join(root, "src/app/session/[id]/page.tsx"), "utf8");
  check("calm screen test id present", sessionUi.includes("consent-ended-calm"));
  check("copy says session ended calmly", sessionUi.includes("Сессия завершена"));
  check("no hard redirect-only on consent in load", sessionUi.includes("setConsentEnded(true)"));
}

console.log("\n=== onboarding copy alignment ===");
{
  const onboarding = readFileSync(join(root, "src/app/onboarding/page.tsx"), "utf8");
  check("no legacy Урок 1 из 5", !onboarding.includes("Урок 1 из 5"));
  check("no legacy Пробуждение card", !onboarding.includes("Пробуждение"));
  check("mentions session 1 of 15", onboarding.includes("Сессия 1 из 15"));
  check("CTA Начать сессию", onboarding.includes("Начать сессию"));
  // Was: `onboarding.includes("/session/w1-s1")`. That assertion pinned defect 2 in
  // place — 08-UX-MONSTER-JOURNEY §1 names this exact line as one of the two places
  // that sent a returning child back to step 1. A newly hatched child still lands on
  // w1-s1, because /continue computes it; a returning one lands where they stopped.
  check("routes into the curriculum via the computed resume door", onboarding.includes('router.push("/continue")'));
  check("does not hardcode the first session", !onboarding.includes("/session/w1-s1"));
}

console.log("\n=== consent email ru default ===");
{
  const route = readFileSync(join(root, "src/app/api/consent/request-code/route.ts"), "utf8");
  check("locale defaults to ru", /locale\s*=\s*parsed\.data\.locale\s*\?\?\s*"ru"/.test(route));
  const consentPage = readFileSync(join(root, "src/app/consent/page.tsx"), "utf8");
  check("consent UI posts locale ru", consentPage.includes('locale: "ru"') || consentPage.includes("locale: 'ru'"));
}

console.log("\n=== DegradeEvent 3A.2 shape ===");
{
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  check("DegradeEvent model present", schema.includes("model DegradeEvent"));
  check("opaqueSessionId field", schema.includes("opaqueSessionId"));
  check("occurredDayBucket field", schema.includes("occurredDayBucket"));
  check("no child-text fields on DegradeEvent", !/model DegradeEvent[\s\S]*?(utterance|prompt|responseText|ipAddress|clerkId)/.test(schema.split("model DegradeEvent")[1].split("model ")[0]));
  check("ReportDeliveryLog present", schema.includes("model ReportDeliveryLog"));
  check("SessionCost present", schema.includes("model SessionCost"));
  const a = mintOpaqueSessionId(dayBucket());
  const b = mintOpaqueSessionId(dayBucket());
  check("opaque ids rotate", a !== b && a.length === 32);
  check("day bucket YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(dayBucket()));
}

console.log("\n=== code re-entry contract (static) ===");
{
  const src = readFileSync(join(root, "src/lib/access-code.ts"), "utf8");
  check("redeemed re-entry returns same clerkId", src.includes('status === "redeemed"') && src.includes("return { ok: true, clerkId: r.clerkId }"));
  check("no state change on re-entry comment", /Re-entry to the SAME account/i.test(src));
}

console.log(`\n${fail === 0 ? "W2 LEARNER STATE: all passed" : `W2 LEARNER STATE: ${fail} FAILED`} (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
