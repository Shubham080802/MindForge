import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { resetPasswordInput } from "@/lib/validation";
import { assertSameOrigin } from "@/lib/request-guard";
import { digestResetToken } from "@/lib/token-digest";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { reportServerError } from "@/lib/observability";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const parsed = resetPasswordInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Invalid password-reset request" }, { status: 400 });
    const { token: rawToken, password } = parsed.data;
    await enforceRateLimit(request, "auth-attempt", rawToken);
    const token = digestResetToken(rawToken);

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({ message: "Invalid or expired reset token" }, { status: 400 });
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ message: "Reset token has expired. Please request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const consumed = await prisma.$transaction(async (tx) => {
      const deleted = await tx.passwordResetToken.deleteMany({
        where: { id: resetToken.id, token, expiresAt: { gt: new Date() } },
      });
      if (deleted.count !== 1) return false;
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      });
      return true;
    });
    if (!consumed) {
      return NextResponse.json({ message: "Invalid or expired reset token" }, { status: 400 });
    }
    await recordAudit({ action: "auth.password_reset.completed", userId: resetToken.userId, targetType: "user", targetId: resetToken.userId });

    return NextResponse.json({ message: "Password has been reset successfully" });
  } catch (error) {
    if (error instanceof Response) return error;
    await reportServerError("Complete password reset", error);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
