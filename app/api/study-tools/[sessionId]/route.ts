import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { getAIChatModel, getAIClient } from "@/lib/ai-client";
import { internalError, parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { enforceRateLimit } from "@/lib/rate-limit";
import { studyToolInput } from "@/lib/validation";
import { getStudyLanguage } from "@/lib/study-languages";
import { parseStudyToolResult } from "@/lib/study-tool-result-schema";
import { loadLearningRecord, persistStudyToolResult } from "@/lib/learning-record";
import { recordAudit } from "@/lib/audit";
import { ZodError } from "zod";

export const runtime = "nodejs";

const STUDY_TOOL_PROMPTS = {
  summary: `Create a concise, well-structured summary of the provided study materials. Include:
- Main topic/title
- Key points (bullet points)
- Important definitions
- Summary should be concise but comprehensive

Format as JSON with: { "title": "...", "summary": "...", "keyPoints": [...], "definitions": { ... } }`,

  concepts: `Extract key concepts, terms, and definitions from the study materials. 
Format as JSON with: { "concepts": [{ "term": "...", "definition": "...", "importance": "high|medium|low", "relatedTerms": [...] }] }`,

  quiz: `Generate exactly 6 practice questions from the study materials for an interactive tutoring session. Mix multiple-choice, true/false, and short-answer questions when the material supports them. Multiple-choice questions must include 3 or 4 complete answer options. Keep each explanation short and encouraging. Name the primary concept assessed by each question.
Format as JSON with: { "questions": [{ "question": "...", "type": "multiple_choice|true_false|short_answer", "options": [...], "correctAnswer": "...", "explanation": "...", "difficulty": "easy|medium|hard", "concept": "..." }] }`,

  translate: `Translate the provided content to the target language. Preserve formatting and technical terms.
Format as JSON with: { "translatedContent": "..." }`,
};

function buildContextFromMaterials(materials: Array<{ extractedText: string | null; url: string; type: string }>) {
  return materials
    .filter((m) => m.extractedText && m.extractedText.length > 0)
    .map((m, i) => `--- Material ${i + 1} (${m.url.split("/").pop() || "Document"}) ---\n${m.extractedText?.slice(0, 4000)}`)
    .join("\n\n");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const auth = await requireAppUser();
    if ("error" in auth) return auth.error;
    const { sessionId } = await params;
    const record = await loadLearningRecord(auth.userId, sessionId);
    if (!record) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    return internalError("Get learning record", error);
  }
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
    const { tool, targetLanguage } = await parseJson(request, studyToolInput);

    // Verify session ownership
    const sessionData = await prisma.session.findFirst({
      where: { id: sessionId, userId: auth.userId },
      include: { materials: true },
    });

    if (!sessionData) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    const context = buildContextFromMaterials(sessionData.materials);

    if (!context) {
      return NextResponse.json({ message: "No study materials with extractable text found" }, { status: 400 });
    }
    const ai = getAIClient();

    let systemPrompt = STUDY_TOOL_PROMPTS[tool as keyof typeof STUDY_TOOL_PROMPTS];
    
    const responseLanguage = getStudyLanguage(targetLanguage || "en");
    systemPrompt += tool === "translate"
      ? `\nTarget language: ${responseLanguage.name}`
      : `\nWrite all learner-facing content in ${responseLanguage.name}. Preserve technical terms when accuracy requires it.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: context },
    ];

    const completion = await ai.chat.completions.create({
      model: getAIChatModel(),
      messages,
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      return NextResponse.json({ message: "Failed to generate result" }, { status: 500 });
    }

    let providerResult: unknown;
    try {
      providerResult = JSON.parse(result);
    } catch (error) {
      console.error("[DEBUG-study-tool-parse]", {
        tool,
        stage: "json",
        length: result.length,
        firstCharacter: result.trim().charAt(0),
        error: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json({ message: "Failed to parse AI response" }, { status: 500 });
    }

    let parsedResult;
    try {
      parsedResult = parseStudyToolResult(tool, providerResult);
    } catch (error) {
      const value = providerResult && typeof providerResult === "object" ? providerResult as Record<string, unknown> : null;
      const questions = Array.isArray(value?.questions) ? value.questions : [];
      console.error("[DEBUG-study-tool-parse]", {
        tool,
        stage: "schema",
        topLevelKeys: value ? Object.keys(value) : [],
        questionCount: questions.length,
        questionShapes: questions.slice(0, 10).map((question) => {
          const item = question && typeof question === "object" ? question as Record<string, unknown> : null;
          return {
            keys: item ? Object.keys(item) : [],
            type: typeof item?.type === "string" ? item.type : typeof item?.type,
            optionsKind: Array.isArray(item?.options) ? "array" : typeof item?.options,
          };
        }),
        issues: error instanceof ZodError
          ? error.issues.map((issue) => ({ code: issue.code, path: issue.path, message: issue.message }))
          : [],
      });
      return NextResponse.json({ message: "Failed to parse AI response" }, { status: 500 });
    }

    const language = targetLanguage || "en";
    const persisted = await persistStudyToolResult(sessionId, tool, language, parsedResult);
    await recordAudit({
      action: tool === "quiz" ? "practice.started" : "study_artifact.created",
      userId: auth.userId,
      targetType: tool === "quiz" ? "practice_round" : "study_artifact",
      targetId: persisted.kind === "round" ? persisted.round.id : persisted.artifact.id,
      metadata: { tool, language },
    });

    if (persisted.kind === "round") {
      // Practice answer keys remain server-side until the learner submits a response.
      return NextResponse.json({ language, ...persisted });
    }

    return NextResponse.json({ result: parsedResult, language, ...persisted });
  } catch (error) {
    return internalError("Study tool", error);
  }
}
