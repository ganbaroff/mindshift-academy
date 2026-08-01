import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasDevTestBypass, isPublicApiPath } from "@/lib/request-access";

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

/**
 * Next 16 request boundary: every Academy API is authenticated unless it is an
 * explicitly side-effect-free public route or a cron route with its own bearer
 * secret. Individual route handlers still authorize their resource operations.
 */
export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Thinking curriculum is default; legacy Module 1 URLs bounce before auth gates.
  const allowLegacy =
    process.env.LEGACY_MODULE1_ENABLED === "1" || process.env.E2E_LEGACY_LESSONS === "1";
  if (!allowLegacy && (pathname === "/lesson" || pathname.startsWith("/lesson/"))) {
    return NextResponse.redirect(new URL("/session/w1-s1", req.url));
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/trpc/")) {
    if (isPublicApiPath(pathname) || hasDevTestBypass(req.headers)) {
      return NextResponse.next();
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedPage(req) && !isDemoPageBypass(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  return NextResponse.next();
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
