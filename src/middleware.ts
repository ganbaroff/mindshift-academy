import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/lesson(.*)",
  "/consent(.*)",
]);

const isDemoBypass = (req: Request) =>
  process.env.NODE_ENV === "development" &&
  new URL(req.url).searchParams.get("demo") === "1";

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isDemoBypass(req)) {
    const { userId } = await auth();
    // Unauthenticated → send them to the sign-in screen (a friendly redirect) rather than a
    // bare 404. In this Next 16 + Clerk combo `auth.protect()` returned 404 for logged-out
    // page requests, so a shared deep-link to a protected route showed "Not Found" instead
    // of sign-in. Authenticated users (userId present) fall through unchanged — same gate,
    // strictly better UX, no weakening of protection.
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk auto-proxy path
    '/__clerk/:path*',
  ],
};
