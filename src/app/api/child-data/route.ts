import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteChildData } from "@/lib/child-data";
import { Errors } from "@/lib/errors";

/** Parent-controlled deletion of all Academy-held child data for this account. */
export async function DELETE() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: Errors.unauthorized }, { status: 401 });
  }

  try {
    const result = await deleteChildData(clerkId);
    return NextResponse.json({ ok: true, deleted: result.found });
  } catch (error) {
    console.error("[child-data] deletion failed:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ error: Errors.calmRetry }, { status: 500 });
  }
}
