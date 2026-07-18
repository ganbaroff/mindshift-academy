import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConsentStatus } from "@/lib/consent";

// GET /api/consent/status — safe consent-state read for the /consent page + parent dashboard.
// Returns no code material — only booleans + the (parent) email on file.
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const status = await getConsentStatus(clerkId);
    return NextResponse.json(status);
  } catch (error) {
    console.error(
      "[consent/status] error:",
      (error as { name?: string })?.name ?? "Error"
    );
    // Fail-closed: report not-valid on error.
    return NextResponse.json(
      {
        exists: false,
        verified: false,
        serviceConsent: false,
        externalAiConsent: false,
        revoked: false,
        current: false,
        valid: false,
        parentEmail: null,
      },
      { status: 200 }
    );
  }
}
