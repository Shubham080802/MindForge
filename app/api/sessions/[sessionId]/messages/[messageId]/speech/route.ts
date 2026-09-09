import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAIConfig } from "@/lib/ai-client";
import { DEFAULT_SPEECH_MODEL, generateGeminiSpeech } from "@/lib/gemini-speech";
import { getOrCreateSpeechAudio, type SpeechAudioStore } from "@/lib/speech-cache";
import { prepareSpeechText, splitSpeechText } from "@/lib/speech-text";
import { getStudyLanguage, isStudyLanguageCode } from "@/lib/study-languages";
import { enforceRateLimit } from "@/lib/rate-limit";
import { internalError, parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { speechChunkInput } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

function messageLanguage(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("language" in metadata)) return "en";
  const language = (metadata as { language?: unknown }).language;
  return isStudyLanguageCode(language) ? language : "en";
}

type SpeechRouteContext = { params: Promise<{ sessionId: string; messageId: string }> };

async function createSpeechResponse(
  request: NextRequest,
  { params }: SpeechRouteContext,
  userId: string,
  chunkIndex: number,
) {
  const { sessionId, messageId } = await params;
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      sessionId,
      role: "assistant",
      session: { userId },
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

  const cacheKey = { messageId, chunkIndex, model: DEFAULT_SPEECH_MODEL };
  const store: SpeechAudioStore = {
    read: async (key) => {
      const cached = await prisma.speechAudio.findUnique({
        where: { messageId_chunkIndex_model: key },
        select: { audio: true },
      });
      return cached?.audio ?? null;
    },
    write: async (key, audio) => {
      const buffer = Buffer.from(audio);
      await prisma.speechAudio.upsert({
        where: { messageId_chunkIndex_model: key },
        create: { ...key, audio: buffer },
        update: { audio: buffer },
      });
    },
  };
  const result = await getOrCreateSpeechAudio(store, cacheKey, async () => {
    await enforceRateLimit(request, "ai", userId);
    return generateGeminiSpeech({
      text,
      locale: language.speechLocale,
      apiKey: getAIConfig().apiKey,
    });
  });
  const audio = result.audio;

  return new Response(new Uint8Array(audio), {
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": String(audio.byteLength),
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "X-Speech-Chunk-Count": String(chunks.length),
      "X-Speech-Language": language.code,
      "X-Speech-Cache": result.cacheStatus,
    },
  });
}

export async function GET(request: NextRequest, context: SpeechRouteContext) {
  try {
    const auth = await requireAppUser();
    if ("error" in auth) return auth.error;
    const { chunkIndex } = speechChunkInput.parse({
      chunkIndex: Number(request.nextUrl.searchParams.get("chunkIndex") ?? "0"),
    });
    return await createSpeechResponse(request, context, auth.userId, chunkIndex);
  } catch (error) {
    return internalError("Generate speech", error);
  }
}

export async function POST(request: NextRequest, context: SpeechRouteContext) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    const { chunkIndex } = await parseJson(request, speechChunkInput);
    return await createSpeechResponse(request, context, auth.userId, chunkIndex);
  } catch (error) {
    return internalError("Generate speech", error);
  }
}
