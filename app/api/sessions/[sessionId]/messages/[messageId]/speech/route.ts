import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAIConfig } from "@/lib/ai-client";
import { generateGeminiSpeech, prepareSpeechText, splitSpeechText } from "@/lib/gemini-speech";
import { getStudyLanguage, isStudyLanguageCode } from "@/lib/study-languages";
import { enforceRateLimit } from "@/lib/rate-limit";
import { internalError, parseJson, requireMutation } from "@/lib/request-guard";
import { speechChunkInput } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

function messageLanguage(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("language" in metadata)) return "en";
  const language = (metadata as { language?: unknown }).language;
  return isStudyLanguageCode(language) ? language : "en";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; messageId: string }> },
) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    await enforceRateLimit(request, "ai", auth.userId);

    const { sessionId, messageId } = await params;
    const { chunkIndex } = await parseJson(request, speechChunkInput);
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        sessionId,
        role: "assistant",
        session: { userId: auth.userId },
      },
      select: { content: true, metadata: true },
    });

    if (!message) {
      return NextResponse.json({ message: "Professor response not found" }, { status: 404 });
    }

    const language = getStudyLanguage(messageLanguage(message.metadata));
    const chunks = splitSpeechText(prepareSpeechText(message.content));
    const text = chunks[chunkIndex];
    if (!text) {
      return NextResponse.json({ message: "Speech segment not found" }, { status: 400 });
    }

    const audio = await generateGeminiSpeech({
      text,
      locale: language.speechLocale,
      apiKey: getAIConfig().apiKey,
    });

    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "private, max-age=86400",
        "X-Speech-Chunk-Count": String(chunks.length),
        "X-Speech-Language": language.code,
      },
    });
  } catch (error) {
    return internalError("Generate speech", error);
  }
}
