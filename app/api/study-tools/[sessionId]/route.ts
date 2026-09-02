import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const STUDY_TOOL_PROMPTS = {
  summary: `Create a concise, well-structured summary of the provided study materials. Include:
- Main topic/title
- Key points (bullet points)
- Important definitions
- Summary should be concise but comprehensive

Format as JSON with: { "title": "...", "summary": "...", "keyPoints": [...], "definitions": { ... } }`,

  concepts: `Extract key concepts, terms, and definitions from the study materials. 
Format as JSON with: { "concepts": [{ "term": "...", "definition": "...", "importance": "high|medium|low", "relatedTerms": [...] }] }`,

  quiz: `Generate practice quiz questions from the study materials.
Format as JSON with: { "questions": [{ "question": "...", "type": "multiple_choice|true_false|short_answer", "options": [...], "correctAnswer": "...", "explanation": "...", "difficulty": "easy|medium|hard" }] }`,

  translate: `Translate the provided content to the target language. Preserve formatting and technical terms.
Format as JSON with: { "translatedContent": "..." }`,

  export: `Export the study session content in the requested format.
Format as JSON with: { "content": "...", "format": "markdown|json|pdf" }`,
};

async function buildContextFromMaterials(materials: Array<{ extractedText: string | null; url: string; type: string }>) {
  return materials
    .filter((m) => m.extractedText && m.extractedText.length > 0)
    .map((m, i) => `--- Material ${i + 1} (${m.url.split("/").pop() || "Document"}) ---\n${m.extractedText?.slice(0, 4000)}`)
    .join("\n\n");
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
    const { tool, content, targetLanguage, format } = await request.json();

    if (!tool || !["summary", "concepts", "quiz", "translate", "export"].includes(tool)) {
      return NextResponse.json({ message: "Invalid tool" }, { status: 400 });
    }

    // Verify session ownership
    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: { materials: true },
    });

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    const context = await buildContextFromMaterials(sessionData.materials);

    if (!context && tool !== "export") {
      return NextResponse.json({ message: "No study materials with extractable text found" }, { status: 400 });
    }

    let systemPrompt = STUDY_TOOL_PROMPTS[tool as keyof typeof STUDY_TOOL_PROMPTS];
    
    if (tool === "translate") {
      systemPrompt += `\nTarget language: ${targetLanguage || "Spanish"}`;
    }
    
    if (tool === "export") {
      systemPrompt += `\nExport format: ${format || "markdown"}`;
    }

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: content || context },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      return NextResponse.json({ message: "Failed to generate result" }, { status: 500 });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(result);
    } catch {
      return NextResponse.json({ message: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json({ result: parsedResult });
  } catch (error) {
    console.error("Study tool error:", error);
    return NextResponse.json({ message: "Failed to process study tool" }, { status: 500 });
  }
}