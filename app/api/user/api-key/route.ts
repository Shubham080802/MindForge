import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, requireMutation } from "@/lib/request-guard";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { message: "Bring-your-own keys are disabled until envelope encryption is configured." },
    { status: 410 },
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    await prisma.user.update({
      where: { id: auth.userId },
      data: { openaiApiKey: null },
    });

    return NextResponse.json({ message: "API key removed" });
  } catch (error) {
    return internalError("Delete API key", error);
  }
}
