import { hasConfiguredParentAccess } from "./parent-allowlist.js";

/**
 * Values required for a public production release. This is intentionally a
 * pure contract: callers can preflight an inherited deployment environment
 * without logging any secret values.
 */
export const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_JS_URL",
  "CLERK_SECRET_KEY",
  // Prisma's CLI config reads this at build time even though runtime data uses
  // the Turso libSQL adapter below. Keep a local SQLite URL in deployment env.
  "DATABASE_URL",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "NVIDIA_API_KEY",
  "GEMINI_API_KEY",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
  "AZURE_OPENAI_API_VERSION",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "CONSENT_CODE_PEPPER",
  "CRON_SECRET",
] as const;

type Environment = Record<string, string | undefined>;

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const normalised = value.trim().toLowerCase();
  return (
    normalised === "your_api_key_here" ||
    normalised.startsWith("your_") ||
    normalised.endsWith("_xxx") ||
    normalised.includes("yourdomain.com") ||
    normalised.startsWith("dummy") ||
    normalised === "configured-value"
  );
}

/** Returns names only — never values — so it is safe for deployment logs. */
export function productionEnvProblems(env: Environment): string[] {
  const problems: string[] = REQUIRED_PRODUCTION_ENV.filter((key) => isPlaceholder(env[key]));

  if (!hasConfiguredParentAccess(env)) {
    problems.push("PARENT_ACCESS_ALLOWLIST");
  }

  // Primary Azure key can be rotated by supplying KEY2; never require both at once.
  if (isPlaceholder(env.AZURE_OPENAI_KEY) && isPlaceholder(env.AZURE_OPENAI_KEY2)) {
    problems.push("AZURE_OPENAI_KEY");
  }

  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_")) {
    problems.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }
  if (!env.CLERK_SECRET_KEY?.startsWith("sk_live_")) {
    problems.push("CLERK_SECRET_KEY");
  }
  if (
    env.NEXT_PUBLIC_CLERK_JS_URL?.trim() !==
    "https://clerk.academy.volaura.app/npm/@clerk/clerk-js@6/dist/clerk.browser.js"
  ) {
    problems.push("NEXT_PUBLIC_CLERK_JS_URL");
  }
  if (env.RESEND_FROM?.includes("onboarding@resend.dev")) {
    problems.push("RESEND_FROM");
  }
  if (!env.DATABASE_URL?.trim().startsWith("file:")) {
    problems.push("DATABASE_URL");
  }

  return [...new Set(problems)];
}
