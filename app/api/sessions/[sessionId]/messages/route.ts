import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ message: "Content required" }, { status: 400 });
    }

    // Verify session ownership
    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: { materials: true },
    });

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        sessionId,
        role: "user",
        content: content.trim(),
      },
    });

    // TODO: Call AI API with context from materials
    // For now, return a placeholder response
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId,
        role: "assistant",
        content: `I understand you're asking about: "${content.trim()}". This is a placeholder response. In production, this would query an AI model with context from your ${sessionData.materials.length} uploaded materials.`,
        metadata: {
          sources: sessionData.materials.slice(0, 3).map((m) => ({
            materialId: m.id,
            excerpt: m.extractedText?.slice(0, 200) || "",
          })),
        },
      },
    });

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 });
  }
}

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

    const messages = await prisma.message.findMany({
      where: { sessionId, session: { userId: session.user.id } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json({ message: "Failed to fetch messages" }, { status: 500 });
  }
}