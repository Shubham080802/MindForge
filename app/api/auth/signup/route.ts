import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { message: "Use /api/auth/send-otp and /api/auth/verify-otp to create a verified account." },
    { status: 410 },
  );
}
