import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpInput } from "@/lib/validation";
import { assertSameOrigin } from "@/lib/request-guard";
import { digestVerificationCode } from "@/lib/token-digest";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { reportServerError } from "@/lib/observability";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const parsed = verifyOtpInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    const { email, otp } = parsed.data;
    await enforceRateLimit(request, "auth-attempt", email);
    const token = digestVerificationCode(email, otp);

    // Find valid token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ message: "Invalid or expired verification code" }, { status: 400 });
    }

    // Check if token matches email
    if (verificationToken.email !== email) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    // Check if token is expired
    if (verificationToken.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
      return NextResponse.json({ message: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: verificationToken.email,
        name: verificationToken.name,
        passwordHash: verificationToken.passwordHash,
      },
    });

    // Delete used token
    await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
    await recordAudit({ action: "auth.account.created", userId: user.id, targetType: "user", targetId: user.id });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    await reportServerError("Verify account", error);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
