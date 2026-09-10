import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAIConfig } from "@/lib/ai-client";
import { generateGeminiSpeech } from "@/lib/gemini-speech";
import { ALWAYS_AVAILABLE_VOICE, SpeechProviderError, chunkContextEnabled, generateElevenLabsSpeech, getElevenLabsConfig } from "@/lib/elevenlabs-speech";
import { resolveSpeechProvider, speechCacheScheme, speechContentType, type SpeechProviderName } from "@/lib/speech-provider";
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
  // boundaries, or a different provider or voice, can never be served against
  // a new chunk index.
  const keyFor = (name: SpeechProviderName, voiceOverride?: string) => ({
    messageId,
    chunkIndex,
    model: `${SPEECH_CHUNK_SCHEME}:${speechCacheScheme(name, language.code, process.env, voiceOverride)}`,
  });
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
  const withGemini = () => getOrCreateSpeechAudio(store, keyFor("gemini"), async () => {
    await enforceRateLimit(request, "ai", userId);
    return generateGeminiSpeech({
      text,
      locale: language.speechLocale,
      apiKey: getAIConfig().apiKey,
    });
  });

  let provider = resolveSpeechProvider();
  let usedVoice: string | undefined;
  let result;

  if (provider === "elevenlabs") {
    const speak = (voiceId?: string) => {
      const config = getElevenLabsConfig(process.env, language.code);
      return generateElevenLabsSpeech({
        text,
        languageCode: language.code,
        // Neighbouring chunks keep the joins from sounding clipped, at a
        // billing cost ElevenLabs does not document. Opt in deliberately.
        previousText: chunkContextEnabled() ? chunks[chunkIndex - 1] : undefined,
        nextText: chunkContextEnabled() ? chunks[chunkIndex + 1] : undefined,
        config: voiceId ? { ...config, voiceId } : config,
      });
    };

    try {
      try {
        result = await getOrCreateSpeechAudio(store, keyFor("elevenlabs"), async () => {
          await enforceRateLimit(request, "ai", userId);
          return speak();
        });
      } catch (error) {
        // A Voice Library voice the plan does not include is reported as 402,
        // indistinguishable from being out of credits. One retry with a premade
        // voice tells the two apart, and keeps the better provider. It is cached
        // under the voice actually used, so an upgraded plan is not served the
        // substitute for ever.
        const restrictedVoice = error instanceof SpeechProviderError
          && error.providerStatus === 402
          && getElevenLabsConfig(process.env, language.code).voiceId !== ALWAYS_AVAILABLE_VOICE;
        if (!restrictedVoice) throw error;

        await reportServerError("Speech voice unavailable on plan", error, {
          language: language.code,
          fallbackVoice: ALWAYS_AVAILABLE_VOICE,
        });
        usedVoice = ALWAYS_AVAILABLE_VOICE;
        result = await getOrCreateSpeechAudio(
          store,
          keyFor("elevenlabs", ALWAYS_AVAILABLE_VOICE),
          () => speak(ALWAYS_AVAILABLE_VOICE),
        );
      }
    } catch (error) {
      // Out of credits is not a reason for the professor to fall silent. Gemini
      // is less lifelike but free, so read-aloud degrades instead of breaking.
      if (!(error instanceof SpeechProviderError && error.isExhausted)) throw error;
      await reportServerError("Speech provider exhausted", error, {
        providerStatus: error.providerStatus,
        fallback: "gemini",
      });
      provider = "gemini";
      result = await withGemini();
    }
  } else {
    result = await withGemini();
  }

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
    ...(usedVoice ? { "X-Speech-Voice-Fallback": usedVoice } : {}),
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
