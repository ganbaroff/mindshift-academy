import { NextResponse } from "next/server";

// Payment removed 2026-06-26 — MindShift Academy is access-by-referral, no checkout.
// Kept as a disabled stub so any stale client call fails closed instead of 404-ing.
export async function POST() {
  return NextResponse.json(
    {
      code: "PAYMENT_DISABLED",
      message: "Оплата отключена. Доступ выдаётся по реферальной ссылке.",
    },
    { status: 410 }
  );
}
