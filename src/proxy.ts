import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasDevTestBypass, isPublicApiPath } from "@/lib/request-access";
import { resolveReleaseSha } from "@/lib/release-identity";

const isProtectedPage = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/lesson(.*)",
  "/consent(.*)",
  "/session(.*)",
  "/certificate(.*)",
]);

const isDemoPageBypass = (req: Request) =>
  process.env.NODE_ENV === "development" &&
  new URL(req.url).searchParams.get("demo") === "1";

function withReleaseIdentity(response: NextResponse) {
  const releaseSha = resolveReleaseSha();
  if (releaseSha) response.headers.set("x-academy-release-sha", releaseSha);
  return response;
}

/**
 * Next 16 request boundary: every Academy API is authenticated unless it is an
 * explicitly side-effect-free public route or a cron route with its own bearer
 * secret. Individual route handlers still authorize their resource operations.
 */
// Clerk's Frontend API is bound to the canonical host, so the SAME build served from the raw
// *.vercel.app deployment URL loads clerk.js and then fails with "unable to attribute this
// request to an instance" — the sign-in form silently never renders. Anyone who reaches that
// address (an old link, a shared preview URL) sees a broken login. Send them home instead.
const CANONICAL_HOST = "academy.volaura.app";

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  if (process.env.NODE_ENV === "production" && req.nextUrl.hostname.endsWith(".vercel.app")) {
    const canonical = new URL(req.nextUrl.toString());
    canonical.hostname = CANONICAL_HOST;
    canonical.port = "";
    canonical.protocol = "https:";
    return NextResponse.redirect(canonical, 308);
  }

  // Thinking curriculum is default; legacy Module 1 URLs bounce before auth gates.
  const allowLegacy =
    process.env.LEGACY_MODULE1_ENABLED === "1" || process.env.E2E_LEGACY_LESSONS === "1";
  if (!allowLegacy && (pathname === "/lesson" || pathname.startsWith("/lesson/"))) {
    return withReleaseIdentity(NextResponse.redirect(new URL("/session/w1-s1", req.url)));
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/trpc/")) {
    if (isPublicApiPath(pathname) || hasDevTestBypass(req.headers)) {
      return withReleaseIdentity(NextResponse.next());
    }

    const { userId } = await auth();
    if (!userId) {
      return withReleaseIdentity(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    return withReleaseIdentity(NextResponse.next());
  }

  if (isProtectedPage(req) && !isDemoPageBypass(req)) {
    const { userId } = await auth();
    if (!userId) {
      return withReleaseIdentity(NextResponse.redirect(new URL("/sign-in", req.url)));
    }
  }

  return withReleaseIdentity(NextResponse.next());
}, process.env.NODE_ENV === "production"
  ? { authorizedParties: ["https://academy.volaura.app"] }
  : {});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
