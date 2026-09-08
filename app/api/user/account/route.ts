import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { internalError, requireMutation } from "@/lib/request-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    const clerk = await clerkClient();
    await clerk.users.deleteUser(auth.clerkUserId);
    await prisma.user.delete({ where: { id: auth.userId } });
    await recordAudit({ action: "auth.account.deleted", targetType: "user", targetId: auth.userId });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    return internalError("Delete account", error);
  }
}
