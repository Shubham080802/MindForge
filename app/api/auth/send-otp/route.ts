import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendVerificationCode } from "@/lib/email";
import { signupInput } from "@/lib/validation";
import { assertSameOrigin } from "@/lib/request-guard";
import { digestVerificationCode } from "@/lib/token-digest";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { reportServerError } from "@/lib/observability";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const parsed = signupInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Invalid registration details" }, { status: 400 });
    const { email, name, password } = parsed.data;
    await enforceRateLimit(request, "auth-request", email);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 400 });
    }

    const otp = crypto.randomInt(100_000, 1_000_000).toString();
    const token = digestVerificationCode(email, otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const passwordHash = await bcrypt.hash(password, 12);

    // Delete any existing verification tokens for this email
    await prisma.emailVerificationToken.deleteMany({ where: { email } });

    // Create verification token
    await prisma.emailVerificationToken.create({
      data: {
        token,
        email,
        name,
        passwordHash,
        expiresAt,
      },
    });

    await sendVerificationCode(email, otp);
    await recordAudit({ action: "auth.verification.sent" });

    return NextResponse.json({ message: "Verification code sent to your email" });
  } catch (error) {
    if (error instanceof Response) return error;
    await reportServerError("Send verification code", error);
    return NextResponse.json({ message: "Failed to send verification code" }, { status: 500 });
  }
}
