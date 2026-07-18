// Operator override: write the CEO's OWN parental consent directly to PROD, so his chat unblocks
// without the /consent UI. Uses the REAL Prisma client (format matches what hasValidConsent reads).
// Creds from .env, never printed. clerkId is the CEO's real account (xp 650, activeStep 4).
import fs from "fs";
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;

const { prisma } = await import("@/lib/prisma");
const { hasValidConsent, CONSENT_VERSION } = await import("@/lib/consent");

const CLERK_ID = "user_3FuTHn9N3SlupJzlD71YDZoyXiF";
const EMAIL = "yusif.ganbarov@gmail.com";
const now = new Date();

await prisma.parentalConsent.upsert({
  where: { clerkId: CLERK_ID },
  create: {
    clerkId: CLERK_ID,
    parentEmail: EMAIL,
    method: "operator-override",
    serviceConsent: true,
    externalAiConsent: true,
    consentVersion: CONSENT_VERSION,
    verifiedAt: now,
  },
  update: {
    serviceConsent: true,
    externalAiConsent: true,
    consentVersion: CONSENT_VERSION,
    verifiedAt: now,
    revokedAt: null,
    method: "operator-override",
  },
});

const ok = await hasValidConsent(CLERK_ID);
console.log("wrote consent for", CLERK_ID, "version", CONSENT_VERSION);
console.log("hasValidConsent(CEO) =>", ok);
await prisma.$disconnect();
