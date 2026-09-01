import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildSystemPrompt(materials: Array<{ extractedText: string | null }>): string {
  const context = materials
    .filter((m) => m.extractedText && m.extractedText.length > 0)
    .map((m, i) => `--- Material ${i + 1} ---\n${m.extractedText?.slice(0, 3000)}`)
    .join("\n\n");

  if (!context) {
    return "You are a helpful AI study assistant. The user has not uploaded any materials with extractable text yet. Answer based on your general knowledge.";
  }

  return `You are an AI study assistant helping a student learn from their uploaded materials. 

Use the following context from their study materials to answer questions accurately and cite sources when possible:

${context}

Guidelines:
- Answer based primarily on the provided materials
- If the answer isn't in the materials, say so and offer general knowledge
- Cite specific materials when referencing them (e.g., "According to Material 1...")
- Be clear, structured, and educational
- Break down complex topics into digestible parts`;
}

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

    // Build context from materials
    const systemPrompt = buildSystemPrompt(sessionData.materials);

    // Get recent conversation history (last 10 messages)
    const recentMessages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...recentMessages.reverse().map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: content.trim() },
    ];

    // Call OpenAI
    let aiContent = "";
    let sources: Array<{ materialId: string; excerpt: string }> = [];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      aiContent = completion.choices[0]?.message?.content || "I couldn't generate a response.";

      // Extract sources from materials that were likely used
      sources = sessionData.materials
        .filter((m) => m.extractedText && m.extractedText.length > 0)
        .slice(0, 3)
        .map((m) => ({
          materialId: m.id,
          excerpt: m.extractedText?.slice(0, 200) || "",
        }));
    } catch (aiError) {
      console.error("OpenAI error:", aiError);
      aiContent = "I encountered an error while generating a response. Please check your OpenAI API key and try again.";
    }

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        sessionId,
        role: "assistant",
        content: aiContent,
        metadata: { sources },
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