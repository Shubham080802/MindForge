import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordReset } from "@/lib/email";
import { forgotPasswordInput } from "@/lib/validation";
import { assertSameOrigin } from "@/lib/request-guard";
import { digestResetToken } from "@/lib/token-digest";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { reportServerError } from "@/lib/observability";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const parsed = forgotPasswordInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Email is required" }, { status: 400 });
    const { email } = parsed.data;
    await enforceRateLimit(request, "auth-request", email);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "If an account exists, a password reset link has been sent to your email." });
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const token = digestResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const appOrigin = process.env.NEXTAUTH_URL;
    if (!appOrigin) throw new Error("NEXTAUTH_URL must be configured before sending password-reset links");
    const resetUrl = new URL("/auth/reset-password", appOrigin);
    resetUrl.searchParams.set("token", rawToken);
    await sendPasswordReset(email, resetUrl.toString());
    await recordAudit({ action: "auth.password_reset.sent", userId: user.id, targetType: "user", targetId: user.id });

    return NextResponse.json({ message: "If an account exists, a password reset link has been sent to your email." });
  } catch (error) {
    if (error instanceof Response) return error;
    await reportServerError("Request password reset", error);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
