import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: {
        materials: {
          select: { id: true, url: true, type: true, size: true, mimeType: true, extractedText: true, createdAt: true },
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
    console.error("Get session error:", error);
    return NextResponse.json({ message: "Failed to fetch session" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    await prisma.session.deleteMany({
      where: { id: sessionId, userId: session.user.id },
    });

    return NextResponse.json({ message: "Session deleted" });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json({ message: "Failed to delete session" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const { title } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ message: "Title required" }, { status: 400 });
    }

    const updated = await prisma.session.update({
      where: { id: sessionId, userId: session.user.id },
      data: { title: title.trim() },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json({ message: "Failed to update session" }, { status: 500 });
  }
}