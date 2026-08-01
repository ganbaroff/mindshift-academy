/**
 * W3 — evolution, milestone chest, certificate, parent reports.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadTs(rel) {
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

console.log("\n=== W3 evolution (pure) ===");
{
  const {
    deriveEvolution,
    CONCEPT_MASTERY_THRESHOLD,
    CAPSTONE_SESSION_ID,
  } = loadTs("src/lib/evolution.ts");

  const none = deriveEvolution({
    masteryByConcept: {},
    completedSessionIds: [],
  });
  check("stage 0 novice with no progress", none.stage === 0 && none.stageId === "novice");
  check("no aura without capstone", none.graduationAura === false);

  const week1 = deriveEvolution({
    masteryByConcept: { precision: CONCEPT_MASTERY_THRESHOLD },
    completedSessionIds: ["w1-s1", "w1-s2", "w1-s3"],
  });
  check("week1+precision → listener", week1.stage === 1 && week1.stageId === "listener");

  const week1noMastery = deriveEvolution({
    masteryByConcept: { precision: CONCEPT_MASTERY_THRESHOLD - 0.01 },
    completedSessionIds: ["w1-s1", "w1-s2", "w1-s3"],
  });
  check("week1 without mastery stays novice", week1noMastery.stage === 0);

  const allButCapstoneAura = deriveEvolution({
    masteryByConcept: {
      precision: 0.4,
      decomposition: 0.4,
      conditions: 0.4,
      pattern: 0.4,
      verification: 0.4,
    },
    completedSessionIds: [
      "w1-s1", "w1-s2", "w1-s3",
      "w2-s1", "w2-s2", "w2-s3",
      "w3-s1", "w3-s2", "w3-s3",
      "w4-s1", "w4-s2", "w4-s3",
      "w5-s1", "w5-s2", "w5-s3",
    ],
    capstoneComplete: true,
  });
  check("full path → thinker", allButCapstoneAura.stage === 5);
  check("capstone → graduation aura", allButCapstoneAura.graduationAura === true);

  const thinkerNoAura = deriveEvolution({
    masteryByConcept: {
      precision: 0.4,
      decomposition: 0.4,
      conditions: 0.4,
      pattern: 0.4,
      verification: 0.4,
    },
    completedSessionIds: [
      "w1-s1", "w1-s2", "w1-s3",
      "w2-s1", "w2-s2", "w2-s3",
      "w3-s1", "w3-s2", "w3-s3",
      "w4-s1", "w4-s2", "w4-s3",
      "w5-s1", "w5-s2",
    ],
    capstoneComplete: false,
  });
  check("week5 incomplete stops before thinker", thinkerNoAura.stage === 4);
  check("no aura without w5-s3", thinkerNoAura.graduationAura === false);
  check("capstone id constant", CAPSTONE_SESSION_ID === "w5-s3");
}

console.log("\n=== W3 no-random rewards ===");
{
  const {
    crystalsForSessionTier,
    announceSessionReward,
    announceWeeklyReward,
    WEEKLY_COSMETICS,
    SESSION_TIER_CRYSTALS,
  } = loadTs("src/lib/milestone-chest.ts");

  check("tier1=10", crystalsForSessionTier(1) === 10);
  check("tier2=15", crystalsForSessionTier(2) === 15);
  check("tier3=20", crystalsForSessionTier(3) === 20);
  check("announce matches table", announceSessionReward(2).crystals === 15);
  check("five weekly cosmetics", WEEKLY_COSMETICS.length === 5);
  check("week3 cosmetic named", announceWeeklyReward(3).nameRu.length > 0);

  // Source scan: rollGacha / Math.random must not appear on reward claim path.
  const claimSrc = readFileSync(join(root, "src/app/api/gacha/claim/route.ts"), "utf8");
  check("gacha claim no longer rolls random", !claimSrc.includes("rollGacha") && !claimSrc.includes("Math.random"));
  const chestSrc = readFileSync(join(root, "src/lib/milestone-chest.ts"), "utf8");
  check("milestone-chest has no Math.random call", !/Math\.random\s*\(/.test(chestSrc));
  const retentionSrc = readFileSync(join(root, "src/lib/retention-engine.ts"), "utf8");
  check("rollGacha removed or deprecated stub", !retentionSrc.includes("export function rollGacha") || retentionSrc.includes("REMOVED"));

  // Determinism: same inputs → same outputs (100 repeats)
  let stable = true;
  for (let i = 0; i < 100; i++) {
    if (announceSessionReward(3).crystals !== SESSION_TIER_CRYSTALS[3]) stable = false;
  }
  check("100x announceSessionReward identical", stable);
}

console.log("\n=== W3 certificate eligibility + 3A.3 ===");
{
  const {
    evaluateCertificateEligibility,
    formulationSubmittedMeta,
    mintCertificateId,
    FORMULATION_CONTENT_VERSION,
    DEFAULT_CERTIFICATE_LABEL,
  } = loadTs("src/lib/certificate.ts");
  const { filterCertificateDisplayLabel, resolveCertificateLabel, MAX_DISPLAY_LABEL_CHARS } =
    loadTs("src/lib/certificate-label.ts");

  const incomplete = evaluateCertificateEligibility({
    completedSessionIds: ["w1-s1"],
    masteryByConcept: {},
    formulationSubmitted: false,
  });
  check("incomplete not eligible", incomplete.eligible === false);
  check("missing lists sessions", incomplete.missing.includes("sessions"));

  const fullIds = [
    "w1-s1", "w1-s2", "w1-s3",
    "w2-s1", "w2-s2", "w2-s3",
    "w3-s1", "w3-s2", "w3-s3",
    "w4-s1", "w4-s2", "w4-s3",
    "w5-s1", "w5-s2", "w5-s3",
  ];
  const mastery = {
    precision: 0.4,
    decomposition: 0.4,
    conditions: 0.4,
    pattern: 0.4,
    verification: 0.4,
  };
  const almost = evaluateCertificateEligibility({
    completedSessionIds: fullIds,
    masteryByConcept: mastery,
    formulationSubmitted: false,
  });
  check("formulation gates certificate", almost.eligible === false && almost.missing.includes("formulation"));

  const ok = evaluateCertificateEligibility({
    completedSessionIds: fullIds,
    masteryByConcept: mastery,
    formulationSubmitted: true,
  });
  check("full criteria eligible", ok.eligible === true);

  const meta = formulationSubmittedMeta();
  check("formulation meta has submitted", meta.submitted === true);
  check("formulation meta has contentVersion", meta.contentVersion === FORMULATION_CONTENT_VERSION);
  check("formulation meta has dayBucket", /^\d{4}-\d{2}-\d{2}$/.test(meta.dayBucket));
  check("formulation meta never has text field", !("text" in meta) && !("utterance" in meta));

  const id1 = mintCertificateId();
  const id2 = mintCertificateId();
  check("certificate ids unique", id1 !== id2 && id1.startsWith("ms-") && id1.length > 20);
  check("ids not derivable from empty user", !id1.includes("user") && !id1.includes("clerk"));

  check("default label", DEFAULT_CERTIFICATE_LABEL === "Участник MindShift V1");
  check("empty → default", filterCertificateDisplayLabel("").ok && filterCertificateDisplayLabel("").label === DEFAULT_CERTIFICATE_LABEL);
  check("too long rejected", !filterCertificateDisplayLabel("x".repeat(MAX_DISPLAY_LABEL_CHARS + 1)).ok);
  check("blocked word rejected", !filterCertificateDisplayLabel("fuck test").ok);
  check("valid short name", filterCertificateDisplayLabel("Саша").ok && filterCertificateDisplayLabel("Саша").label === "Саша");
  check("resolve falls back on bad", resolveCertificateLabel("shit") === DEFAULT_CERTIFICATE_LABEL);
}

console.log("\n=== W3 parent reports v2 ===");
{
  const { buildWeeklyReportV2, buildCompletionLetter } = loadTs("src/lib/parent-reports.ts");
  const snap = buildWeeklyReportV2(1, {
    precision: 0.5,
    decomposition: 0.2,
    conditions: 0.3,
    pattern: 0.4,
    verification: 0.1,
  });
  check("weekly has 5 skills", snap.masteryPerSkill.length === 5);
  check("struggled-most is lowest", snap.struggledMost.concept === "verification");
  check("dinner question present", snap.dinnerQuestionRu.length > 10);
  check("misconception present", snap.misconceptionRu.length > 0);

  const letter = buildCompletionLetter({
    masteryByConcept: { precision: 0.5, decomposition: 0.5, conditions: 0.5, pattern: 0.5, verification: 0.5 },
    certificateId: "ms-test",
    recipientLabel: "Участник MindShift V1",
    monsterName: "Искра",
    issuedDayBucket: "2026-07-31",
  });
  check("completion letter has certificate id", letter.certificateId === "ms-test");
  check("completion letter skill rows", letter.masteryPerSkill.length === 5);
}

console.log("\n=== W3 banned lexicon on new child-facing copy ===");
{
  const { findBannedLexicon } = loadTs("src/lib/banned-lexicon.ts");
  const surfaces = [
    "src/app/certificate/page.tsx",
    "src/components/gamification/MilestoneJourneyMap.tsx",
    "src/components/capstone/CalmClosure.tsx",
    "src/lib/milestone-chest.ts",
    "src/lib/certificate-label.ts",
    "src/app/session/[id]/page.tsx",
  ];
  let clean = true;
  for (const rel of surfaces) {
    let text = "";
    try {
      text = readFileSync(join(root, rel), "utf8");
    } catch {
      clean = false;
      check(`readable ${rel}`, false);
      continue;
    }
    const hits = findBannedLexicon(text);
    check(`no banned lexicon in ${rel}`, hits.length === 0);
    if (hits.length) clean = false;
  }
  void clean;
}

console.log("\n=== W3 inventory grandfather + gacha repurpose ===");
{
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  check("Inventory model retained", schema.includes("model Inventory"));
  check("Certificate model added", schema.includes("model Certificate"));
  check("FormulationSubmission model added", schema.includes("model FormulationSubmission"));

  const journey = join(root, "src/components/gamification/MilestoneJourneyMap.tsx");
  let hasJourney = false;
  try {
    readFileSync(journey);
    hasJourney = true;
  } catch {
    /* missing */
  }
  check("MilestoneJourneyMap exists (GachaCalendar repurposed)", hasJourney);

  const gachaCal = join(root, "src/components/gamification/GachaCalendar.tsx");
  let gachaGoneOrStub = false;
  try {
    const g = readFileSync(gachaCal, "utf8");
    gachaGoneOrStub = g.includes("DEPRECATED") || g.includes("MilestoneJourneyMap") || !g.includes("rollGacha");
  } catch {
    gachaGoneOrStub = true; // removed entirely is OK
  }
  check("GachaCalendar removed or redirected", gachaGoneOrStub);
}

console.log(`\nW3 tests: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
