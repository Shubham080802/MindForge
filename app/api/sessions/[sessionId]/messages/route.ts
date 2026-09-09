import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getAIChatModel, getAIClient } from "@/lib/ai-client";
import { internalError, parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { sessionMessageInput } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reportServerError } from "@/lib/observability";
import { buildProfessorPrompt } from "@/lib/professor-prompt";
import { enforceStudyScope } from "@/lib/study-scope-server";

export const runtime = "nodejs";

function createSSEStream(controller: ReadableStreamDefaultController, text: string) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
}

function closeSSEStream(controller: ReadableStreamDefaultController) {
  controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
  controller.close();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    await enforceRateLimit(request, "ai", auth.userId);

    const { sessionId } = await params;
    const { content, stream = false, language } = await parseJson(request, sessionMessageInput);
    const responseLanguage = language ?? "en";

    // Verify session ownership
    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: auth.userId },
      include: { materials: true },
    });

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }
    const scope = await enforceStudyScope(content);
    if (!scope.allowed) {
      return NextResponse.json(
        { message: scope.message, code: "STUDY_SCOPE_REQUIRED" },
        { status: "unavailable" in scope ? 503 : 422 },
      );
    }
    const ai = getAIClient();

    // Save user message
    await prisma.message.create({
      data: {
        sessionId,
        role: "user",
        content,
      },
    });

    // Build context from materials
    const systemPrompt = buildProfessorPrompt(sessionData.materials, responseLanguage);

    // Get recent conversation history (last 10 messages)
    const recentMessages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    let sources: Array<{ materialId: string; excerpt: string }> = [];

    // Extract sources from materials
    sources = sessionData.materials
      .filter((m) => m.extractedText && m.extractedText.length > 0)
      .slice(0, 3)
      .map((m) => ({
        materialId: m.id,
        excerpt: m.extractedText?.slice(0, 200) || "",
      }));
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages.slice().reverse().map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      })),
    ];
    const generationOptions = {
      model: getAIChatModel(),
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    };
    const saveAssistant = (assistantContent: string) => prisma.message.create({
      data: { sessionId, role: "assistant", content: assistantContent, metadata: { sources, language: responseLanguage } },
    });

    // If streaming requested, return SSE stream
    if (stream) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          try {
            let fullContent = "";
            
            const completion = await ai.chat.completions.create({
              ...generationOptions,
              stream: true,
            });

            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`));
              }
            }

            if (!fullContent.trim()) {
              throw new Error("AI provider returned an empty response");
            }

            // Save complete assistant message
            const assistantMessage = await saveAssistant(fullContent);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message: assistantMessage, done: true })}\n\n`));
          } catch (aiError) {
            await reportServerError("AI stream", aiError, { sessionId });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Failed to generate response", done: true })}\n\n`));
          } finally {
            closeSSEStream(controller);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming fallback (original behavior)
    let aiContent = "";

    try {
      const completion = await ai.chat.completions.create({
        ...generationOptions,
      });

      aiContent = completion.choices[0]?.message?.content || "I couldn't generate a response.";
    } catch (aiError) {
      await reportServerError("AI completion", aiError, { sessionId });
      aiContent = "I encountered an error while generating a response. Please try again.";
    }

    // Save assistant message
    const assistantMessage = await saveAssistant(aiContent);

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    return internalError("Send message", error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAppUser();
    if ("error" in auth) return auth.error;

    const { sessionId } = await params;

    const messages = await prisma.message.findMany({
      where: { sessionId, session: { userId: auth.userId } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return internalError("Get messages", error);
  }
}
