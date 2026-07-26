// REAL dev.db integration test for the COPPA parental-consent GATE.
// Imports the ACTUAL hasValidConsent / recordConsent / revokeConsent /
// createVerificationCode / verifyCode from src/lib/consent.ts (not mocks) and
// exercises them against the local SQLite dev.db (TURSO_* unset => prisma.ts
// falls back to file:./dev.db).
//
// Run:  node scripts/test-consent.mjs [runSuffix]
//
// It registers the @/* alias resolve hook itself (same loader test-rewards.ts
// uses) so it runs with a plain `node scripts/test-consent.mjs`.
import { register } from "node:module";
register("./alias-loader.mjs", import.meta.url);

// Dynamic import AFTER the loader is registered so the @/ alias resolves.
const {
  hasValidConsent,
  recordConsent,
  revokeConsent,
  createVerificationCode,
  verifyCode,
  CONSENT_VERSION,
} = await import("@/lib/consent");
const { prisma } = await import("@/lib/prisma");

const SUFFIX = process.argv[2] || `${Date.now()}-${process.pid}`;

const results = [];
function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name} :: ${detail}`);
}

const createdClerkIds = [];
function cid(tag) {
  const id = `consent_test_${tag}_${SUFFIX}`;
  createdClerkIds.push(id);
  return id;
}

// Direct row insert for edge-case states recordConsent() won't produce
// (unverified, stale version, single opt-in). Bypasses the helper on purpose.
async function insertConsent(clerkId, fields) {
  await prisma.parentalConsent.create({
    data: {
      clerkId,
      parentEmail: "parent@example.com",
      method: "email-plus",
      serviceConsent: false,
      externalAiConsent: false,
      consentVersion: CONSENT_VERSION,
      verifiedAt: null,
      revokedAt: null,
      ...fields,
    },
  });
}

async function main() {
  console.log(
    `\n=== COPPA consent-gate dev.db integration test (suffix=${SUFFIX}, version=${CONSENT_VERSION}) ===\n`
  );

  // (a) NO ParentalConsent row -> hasValidConsent=false -> the gate would 403.
  {
    const clerkId = cid("a_no_row");
    const ok = await hasValidConsent(clerkId);
    assert(
      "(a) no consent row -> hasValidConsent=false (gate 403s)",
      ok === false,
      `hasValidConsent=${ok}`
    );
  }

  // (b) VALID consent (both opt-ins, verified, current version, not revoked)
  //     written via the REAL recordConsent() -> hasValidConsent=true -> gate passes.
  {
    const clerkId = cid("b_valid");
    await recordConsent({
      clerkId,
      parentEmail: "parent@example.com",
      serviceConsent: true,
      externalAiConsent: true,
      ipAddress: "127.0.0.1",
    });
    const ok = await hasValidConsent(clerkId);
    assert(
      "(b) valid consent -> hasValidConsent=true (gate passes)",
      ok === true,
      `hasValidConsent=${ok}`
    );
  }

  // (c1) REVOKED -> false. Record valid, then revoke via the real revokeConsent().
  {
    const clerkId = cid("c1_revoked");
    await recordConsent({
      clerkId,
      parentEmail: "parent@example.com",
      serviceConsent: true,
      externalAiConsent: true,
    });
    const before = await hasValidConsent(clerkId);
    const revoked = await revokeConsent(clerkId);
    const after = await hasValidConsent(clerkId);
    assert(
      "(c1) revoked consent -> hasValidConsent=false (immediately blocks)",
      before === true && revoked === true && after === false,
      `before=${before} revoked=${revoked} after=${after}`
    );
  }

  // (c2) STALE consentVersion (e.g. policy changed) -> false, even though verified + both opt-ins.
  {
    const clerkId = cid("c2_stale_version");
    await insertConsent(clerkId, {
      serviceConsent: true,
      externalAiConsent: true,
      verifiedAt: new Date(),
      consentVersion: "1999-01-01", // deliberately not current
    });
    const ok = await hasValidConsent(clerkId);
    assert(
      "(c2) stale consentVersion -> hasValidConsent=false (re-prompt)",
      ok === false,
      `hasValidConsent=${ok}`
    );
  }

  // (c3) UNVERIFIED (verifiedAt=null) but both opt-ins checked -> false.
  {
    const clerkId = cid("c3_unverified");
    await insertConsent(clerkId, {
      serviceConsent: true,
      externalAiConsent: true,
      verifiedAt: null,
    });
    const ok = await hasValidConsent(clerkId);
    assert(
      "(c3) unverified (verifiedAt=null) -> hasValidConsent=false",
      ok === false,
      `hasValidConsent=${ok}`
    );
  }

  // (c4) SERVICE consent only (external-AI opt-in missing) -> false.
  {
    const clerkId = cid("c4_service_only");
    await insertConsent(clerkId, {
      serviceConsent: true,
      externalAiConsent: false,
      verifiedAt: new Date(),
    });
    const ok = await hasValidConsent(clerkId);
    assert(
      "(c4) service-only (no external-AI opt-in) -> hasValidConsent=false",
      ok === false,
      `hasValidConsent=${ok}`
    );
  }

  // (c5) EXTERNAL-AI consent only (service opt-in missing) -> false.
  {
    const clerkId = cid("c5_external_only");
    await insertConsent(clerkId, {
      serviceConsent: false,
      externalAiConsent: true,
      verifiedAt: new Date(),
    });
    const ok = await hasValidConsent(clerkId);
    assert(
      "(c5) external-AI-only (no service opt-in) -> hasValidConsent=false",
      ok === false,
      `hasValidConsent=${ok}`
    );
  }

  // (d) THROWN error in the resolver -> false (FAIL-CLOSED). Monkeypatch the
  //     prisma method hasValidConsent() calls so it throws; the resolver must
  //     swallow it and return false, never open the gate.
  {
    const clerkId = cid("d_fail_closed");
    // A valid row exists, so ONLY the thrown error can make it false here.
    await recordConsent({
      clerkId,
      parentEmail: "parent@example.com",
      serviceConsent: true,
      externalAiConsent: true,
    });
    const sanity = await hasValidConsent(clerkId);
    const original = prisma.parentalConsent.findUnique;
    const originalConsoleError = console.error;
    prisma.parentalConsent.findUnique = () => {
      throw new Error("simulated DB/adapter failure");
    };
    // The product deliberately logs this fail-closed error; suppress it only in
    // this intentional fault-injection assertion so a green test lane is quiet.
    console.error = () => {};
    let ok;
    try {
      ok = await hasValidConsent(clerkId);
    } finally {
      prisma.parentalConsent.findUnique = original; // restore for cleanup
      console.error = originalConsoleError;
    }
    assert(
      "(d) resolver throws -> hasValidConsent=false (FAIL-CLOSED, valid row present)",
      sanity === true && ok === false,
      `sanityValid=${sanity} onError=${ok}`
    );
  }

  // (e) BONUS end-to-end: verification code lifecycle feeds recordConsent, then the
  //     gate opens. Proves the hashed-code path unlocks a real, verified consent.
  {
    const clerkId = cid("e_code_flow");
    const { code } = await createVerificationCode(clerkId, "parent@example.com");
    const wrong = await verifyCode(clerkId, "000000");
    const right = await verifyCode(clerkId, code);
    const replay = await verifyCode(clerkId, code); // single-use: must fail
    if (right.ok) {
      await recordConsent({
        clerkId,
        parentEmail: right.parentEmail,
        serviceConsent: true,
        externalAiConsent: true,
      });
    }
    const ok = await hasValidConsent(clerkId);
    assert(
      "(e) code verify (wrong->fail, right->ok, replay->fail) then record -> gate opens",
      wrong.ok === false && right.ok === true && replay.ok === false && ok === true,
      `wrong=${wrong.ok} right=${right.ok} replay=${replay.ok} valid=${ok}`
    );
  }
}

async function cleanup() {
  for (const clerkId of createdClerkIds) {
    try {
      await prisma.parentalConsent.deleteMany({ where: { clerkId } });
      await prisma.consentVerification.deleteMany({ where: { clerkId } });
    } catch (e) {
      console.warn(`cleanup warn for ${clerkId}:`, e.message);
    }
  }
}

main()
  .catch((e) => {
    console.error("TEST HARNESS ERROR:", e);
    results.push({ name: "harness", pass: false, detail: String(e) });
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    const failed = results.filter((r) => !r.pass);
    console.log(
      `\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`
    );
    if (failed.length) {
      console.log("FAILURES:", failed.map((f) => f.name).join("; "));
      process.exitCode = 1;
    } else {
      console.log(
        "ALL ASSERTIONS PASSED — gate blocks without valid consent, opens with it, fail-closed on error."
      );
    }
  });
