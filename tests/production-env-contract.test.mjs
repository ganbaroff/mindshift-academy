#!/usr/bin/env node
// Pure production-preflight contract: never reads or prints actual secrets.
const { REQUIRED_PRODUCTION_ENV, productionEnvProblems } = await import(
  "../src/lib/production-env.ts"
);

let failed = 0;
function check(name, condition) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}`);
  if (!condition) failed += 1;
}

const valid = {
  ...Object.fromEntries(
  REQUIRED_PRODUCTION_ENV.map((key) => [
    key,
    key === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
      ? "pk_live_example"
      : key === "NEXT_PUBLIC_CLERK_JS_URL"
        ? "https://clerk.academy.volaura.app/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
      : key === "CLERK_SECRET_KEY"
        ? "sk_live_example"
        : "real-secret-987654",
  ])
  ),
  DATABASE_URL: "file:./dev.db",
  AZURE_OPENAI_KEY: "azure-primary-key",
  AZURE_OPENAI_ENDPOINT: "https://volaura-ai.openai.azure.com",
  AZURE_OPENAI_DEPLOYMENT: "gpt-4o",
  AZURE_OPENAI_API_VERSION: "2024-10-21",
  ALLOWLIST_EMAILS: "parent@example.com",
};

check("complete non-placeholder production contract is accepted", productionEnvProblems(valid).length === 0);

const perParentGrantOnly = {
  ...valid,
  ALLOWLIST_EMAILS: "",
  ACADEMY_ALLOW_EMAIL_4FC4A9A0349B3C30C2D236773C8E1892A198BBF6C4D089F1678C229931B9DC6A: "1",
};
check(
  "a production deployment accepts a per-parent additive grant without a legacy bulk list",
  productionEnvProblems(perParentGrantOnly).length === 0
);

const noParentGrant = { ...valid, ALLOWLIST_EMAILS: "" };
check(
  "a production deployment rejects an empty parent access configuration",
  productionEnvProblems(noParentGrant).includes("PARENT_ACCESS_ALLOWLIST")
);

const missingProvider = { ...valid, GEMINI_API_KEY: "" };
check(
  "missing Gemini key is identified by name without exposing a value",
  productionEnvProblems(missingProvider).includes("GEMINI_API_KEY")
);

const testClerkKey = { ...valid, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example" };
check(
  "test Clerk publishable key is rejected for a production preflight",
  productionEnvProblems(testClerkKey).includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
);

const wrongClerkJsUrl = { ...valid, NEXT_PUBLIC_CLERK_JS_URL: "https://example.com/clerk.js" };
check(
  "production Clerk JS must load from the verified custom FAPI domain",
  productionEnvProblems(wrongClerkJsUrl).includes("NEXT_PUBLIC_CLERK_JS_URL")
);

const missingPrismaDatasource = { ...valid, DATABASE_URL: "" };
check(
  "missing Prisma build datasource is identified by name",
  productionEnvProblems(missingPrismaDatasource).includes("DATABASE_URL")
);

const nonSqlitePrismaDatasource = { ...valid, DATABASE_URL: "https://example.com/not-sqlite" };
check(
  "Prisma build datasource must use an explicit SQLite file URL",
  productionEnvProblems(nonSqlitePrismaDatasource).includes("DATABASE_URL")
);

const missingAzureEndpoint = { ...valid, AZURE_OPENAI_ENDPOINT: "" };
check(
  "Azure tutor endpoint is required for the production chat path",
  productionEnvProblems(missingAzureEndpoint).includes("AZURE_OPENAI_ENDPOINT")
);

const rotatedAzureKey = { ...valid, AZURE_OPENAI_KEY: "", AZURE_OPENAI_KEY2: "azure-rotation-key" };
check(
  "Azure key rotation accepts the secondary key without exposing either value",
  !productionEnvProblems(rotatedAzureKey).includes("AZURE_OPENAI_KEY")
);

const noAzureKey = { ...valid, AZURE_OPENAI_KEY: "", AZURE_OPENAI_KEY2: "" };
check(
  "production rejects a tutor path with neither Azure key configured",
  productionEnvProblems(noAzureKey).includes("AZURE_OPENAI_KEY")
);

if (failed > 0) process.exit(1);
console.log("ALL PRODUCTION ENV CONTRACT ASSERTIONS PASSED");
