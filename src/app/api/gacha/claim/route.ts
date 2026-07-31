import { NextResponse } from "next/server";

/**
 * Daily gacha claim — permanently retired.
 * Rewards are deterministic via milestone chest (session tier crystals + weekly cosmetics).
 * Existing Inventory rows are grandfathered and never deleted by this change.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Случайные награды отключены. Награды теперь фиксированные на карте пути.",
      code: "GACHA_REMOVED",
      replacement: "milestone-chest",
    },
    { status: 410 }
  );
}
