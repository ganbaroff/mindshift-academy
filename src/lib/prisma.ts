import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// P0 (data-loss): in production we MUST have a real shared DB (Turso). Without
// TURSO_DATABASE_URL the libSQL adapter silently falls back to a local
// `file:./dev.db` — on serverless that is a per-lambda ephemeral SQLite, wiped
// on every cold start, so a child's progress "saves" then vanishes. Fail CLOSED
// at prod runtime (loud throw) rather than lose data silently. The NEXT_PHASE
// check lets `next build` pass (build runs with NODE_ENV=production but no DB).
const isProd = process.env.NODE_ENV === "production";
const isBuild = process.env.NEXT_PHASE === "phase-production-build";
if (isProd && !isBuild && !process.env.TURSO_DATABASE_URL) {
  throw new Error(
    "FATAL: TURSO_DATABASE_URL is not set in production. Refusing to start on an " +
      "ephemeral local SQLite (file:./dev.db) — child progress would silently not " +
      "persist. Provision a Turso database and set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN."
  );
}

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL || "file:./dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
