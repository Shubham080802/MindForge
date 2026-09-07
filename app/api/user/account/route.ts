import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMutation } from "@/lib/request-guard";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    await prisma.user.delete({
      where: { id: auth.userId },
    });

    return NextResponse.json({ message: "Account deleted" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Delete account error:", error);
    return NextResponse.json({ message: "Failed to delete account" }, { status: 500 });
  }
}
