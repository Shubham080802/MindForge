import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { sessionUpdateInput } from "@/lib/validation";

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
    if (error instanceof Response) return error;
    console.error("Get session error:", error);
    return NextResponse.json({ message: "Failed to fetch session" }, { status: 500 });
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

    return NextResponse.json({ message: "Session deleted" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Delete session error:", error);
    return NextResponse.json({ message: "Failed to delete session" }, { status: 500 });
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

    return NextResponse.json({ session: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update session error:", error);
    return NextResponse.json({ message: "Failed to update session" }, { status: 500 });
  }
}
