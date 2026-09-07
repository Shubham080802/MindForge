import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { sessionUpdateInput } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAppUser();
    if ("error" in auth) return auth.error;

    const { sessionId } = await params;

    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: auth.userId },
      include: {
        materials: {
          select: { id: true, fileName: true, url: true, type: true, size: true, mimeType: true, extractedText: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { messages: true, materials: true } },
      },
    });

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session: sessionData });
  } catch (error) {
    return internalError("Get session", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    const { sessionId } = await params;

    await prisma.session.deleteMany({
      where: { id: sessionId, userId: auth.userId },
    });
    await recordAudit({ action: "session.deleted", userId: auth.userId, targetType: "session", targetId: sessionId });

    return NextResponse.json({ message: "Session deleted" });
  } catch (error) {
    return internalError("Delete session", error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;

    const { sessionId } = await params;
    const { title } = await parseJson(request, sessionUpdateInput);

    const updated = await prisma.session.update({
      where: { id: sessionId, userId: auth.userId },
      data: { title },
    });
    await recordAudit({ action: "session.renamed", userId: auth.userId, targetType: "session", targetId: sessionId });

    return NextResponse.json({ session: updated });
  } catch (error) {
    return internalError("Update session", error);
  }
}
