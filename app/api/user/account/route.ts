import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, requireMutation } from "@/lib/request-guard";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    await prisma.$transaction(async (tx) => {
      await tx.auditEvent.create({
        data: { action: "auth.account.deleted", userId: auth.userId, targetType: "user", targetId: auth.userId },
      });
      await tx.user.delete({ where: { id: auth.userId } });
    });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    return internalError("Delete account", error);
  }
}
