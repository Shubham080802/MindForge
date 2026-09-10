import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAIConfig } from "@/lib/ai-client";
import { generateGeminiSpeech } from "@/lib/gemini-speech";
import { SpeechProviderError, chunkContextEnabled, generateElevenLabsSpeech, getElevenLabsConfig } from "@/lib/elevenlabs-speech";
import { resolveSpeechProvider, speechCacheScheme, speechContentType } from "@/lib/speech-provider";
import { getOrCreateSpeechAudio, type SpeechAudioStore } from "@/lib/speech-cache";
import { SPEECH_CHUNK_SCHEME, prepareSpeechText, splitSpeechText } from "@/lib/speech-text";
import { getStudyLanguage, isStudyLanguageCode } from "@/lib/study-languages";
import { enforceRateLimit } from "@/lib/rate-limit";
import { internalError, parseJson, requireAppUser, requireMutation } from "@/lib/request-guard";
import { speechChunkInput } from "@/lib/validation";
import { reportServerError } from "@/lib/observability";
import { contentRangeHeader, resolveByteRange, unsatisfiableRangeHeader } from "@/lib/http-range";

export const runtime = "nodejs";
export const maxDuration = 60;

function messageLanguage(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || !("language" in metadata)) return "en";
  const language = (metadata as { language?: unknown }).language;
  return isStudyLanguageCode(language) ? language : "en";
}

type SpeechRouteContext = { params: Promise<{ sessionId: string; messageId: string }> };

/** A provider's own reason is more actionable than "request could not be completed". */
async function speechError(error: unknown) {
  if (error instanceof SpeechProviderError) {
    await reportServerError("Generate speech", error, { providerStatus: error.providerStatus });
    return NextResponse.json({ message: error.message }, { status: 502 });
  }
  return internalError("Generate speech", error);
}

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

  // The scheme is part of the key so audio cached under previous chunk
  // boundaries can never be served against a new chunk index.
  const provider = resolveSpeechProvider();
  const cacheKey = {
    messageId,
    chunkIndex,
    model: `${SPEECH_CHUNK_SCHEME}:${speechCacheScheme(provider, language.code)}`,
  };
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
    if (provider === "elevenlabs") {
      return generateElevenLabsSpeech({
        text,
        languageCode: language.code,
        // Neighbouring chunks keep the joins from sounding clipped, at a
        // billing cost ElevenLabs does not document. Opt in deliberately.
        previousText: chunkContextEnabled() ? chunks[chunkIndex - 1] : undefined,
        nextText: chunkContextEnabled() ? chunks[chunkIndex + 1] : undefined,
        config: getElevenLabsConfig(process.env, language.code),
      });
    }
    return generateGeminiSpeech({
      text,
      locale: language.speechLocale,
      apiKey: getAIConfig().apiKey,
    });
  });
  const audio = new Uint8Array(result.audio);
  const headers: Record<string, string> = {
    "Content-Type": speechContentType(provider),
    // Without this the browser's media loader stalls at readyState 0.
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=86400",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "X-Speech-Chunk-Count": String(chunks.length),
    "X-Speech-Language": language.code,
    "X-Speech-Cache": result.cacheStatus,
    "X-Speech-Provider": provider,
  };

  const range = resolveByteRange(request.headers.get("range"), audio.byteLength);

  if (range.type === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": unsatisfiableRangeHeader(audio.byteLength) },
    });
  }

  if (range.type === "partial") {
    const slice = audio.subarray(range.start, range.end + 1);
    return new Response(slice, {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": contentRangeHeader(range.start, range.end, audio.byteLength),
        "Content-Length": String(slice.byteLength),
      },
    });
  }

  return new Response(audio, {
    status: 200,
    headers: { ...headers, "Content-Length": String(audio.byteLength) },
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
    return speechError(error);
  }
}

export async function POST(request: NextRequest, context: SpeechRouteContext) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    const { chunkIndex } = await parseJson(request, speechChunkInput);
    return await createSpeechResponse(request, context, auth.userId, chunkIndex);
  } catch (error) {
    return speechError(error);
  }
}
