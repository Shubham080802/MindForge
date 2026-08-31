import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, initialQuery, materialIds } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ message: "Title required" }, { status: 400 });
    }

    const newSession = await prisma.session.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
      },
    });

    if (materialIds?.length) {
      await prisma.material.updateMany({
        where: { id: { in: materialIds } },
        data: { sessionId: newSession.id },
      });
    }

    return NextResponse.json({
      session: {
        id: newSession.id,
        title: newSession.title,
        createdAt: newSession.createdAt,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ message: "Failed to create session" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.session.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        materials: {
          select: { id: true, url: true, type: true, size: true, mimeType: true, createdAt: true },
        },
        _count: { select: { messages: true, materials: true } },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json({ message: "Failed to fetch sessions" }, { status: 500 });
  }
}