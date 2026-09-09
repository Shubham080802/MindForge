const GEMINI_SPEECH_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
export const DEFAULT_SPEECH_MODEL = "gemini-3.1-flash-tts-preview";
export const FALLBACK_SPEECH_MODEL = "gemini-2.5-flash-preview-tts";

type Fetcher = typeof fetch;

interface GenerateGeminiSpeechOptions {
  text: string;
  locale: string;
  apiKey: string;
  fetcher?: Fetcher;
}

export function buildGeminiSpeechRequest(text: string, locale: string, model = DEFAULT_SPEECH_MODEL) {
  return {
    model,
    input: [
      "Read the transcript verbatim in a warm, clear professor voice.",
      `Use fluent ${locale} pronunciation. Do not translate, summarize, or add words.`,
      "Transcript:",
      text,
    ].join("\n"),
    response_format: { type: "audio" as const },
    generation_config: {
      speech_config: [{ voice: "Charon", language: locale }],
    },
    store: false,
  };
}

export function pcmToWav(
  pcm: Uint8Array,
  sampleRate = 24_000,
  channels = 1,
  bitsPerSample = 16,
): Buffer {
  const headerSize = 44;
  const wav = Buffer.alloc(headerSize + pcm.byteLength);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + pcm.byteLength, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(byteRate, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(bitsPerSample, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(pcm.byteLength, 40);
  Buffer.from(pcm).copy(wav, headerSize);

  return wav;
}

function l16ToLittleEndian(l16: Uint8Array): Uint8Array {
  const pcm = Uint8Array.from(l16);
  for (let index = 0; index + 1 < pcm.byteLength; index += 2) {
    const highByte = pcm[index]!;
    pcm[index] = pcm[index + 1]!;
    pcm[index + 1] = highByte;
  }
  return pcm;
}

export async function generateGeminiSpeech({
  text,
  locale,
  apiKey,
  fetcher = fetch,
}: GenerateGeminiSpeechOptions): Promise<Buffer> {
  const requestSpeech = async (model: string) => {
    const response = await fetcher(GEMINI_SPEECH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(buildGeminiSpeechRequest(text, locale, model)),
      signal: AbortSignal.timeout(30_000),
    });
    return { response, body: await response.json() as unknown };
  };

  let result = await requestSpeech(DEFAULT_SPEECH_MODEL);
  if (result.response.status === 429) {
    result = await requestSpeech(FALLBACK_SPEECH_MODEL);
  }
  const { response, body } = result;

  if (!response.ok) {
    const errorStatus = body && typeof body === "object" && "error" in body
      ? (body as { error?: { status?: string } }).error?.status
      : undefined;
    throw new Error(`Gemini speech request failed (${errorStatus || response.status})`);
  }

  const findAudio = (value: unknown): { data: string; mimeType?: string; sampleRate?: number; channels?: number } | null => {
    if (!value || typeof value !== "object") return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const audio = findAudio(item);
        if (audio) return audio;
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    if (record.type === "audio" && typeof record.data === "string") {
      return {
        data: record.data,
        mimeType: typeof record.mime_type === "string" ? record.mime_type : undefined,
        sampleRate: typeof record.sample_rate === "number" ? record.sample_rate : undefined,
        channels: typeof record.channels === "number" ? record.channels : undefined,
      };
    }
    if (record.output_audio && typeof record.output_audio === "object") {
      const output = record.output_audio as Record<string, unknown>;
      if (typeof output.data === "string") {
        return { data: output.data };
      }
    }

    for (const nested of Object.values(record)) {
      const audio = findAudio(nested);
      if (audio) return audio;
    }
    return null;
  };

  const audio = findAudio(body);
  if (!audio) throw new Error("Gemini speech returned no audio");
  const decoded = Buffer.from(audio.data, "base64");
  if (audio.mimeType?.toLowerCase().startsWith("audio/wav")) return decoded;

  const pcm = audio.mimeType?.toLowerCase().startsWith("audio/l16")
    ? l16ToLittleEndian(decoded)
    : decoded;

  return pcmToWav(pcm, audio.sampleRate || 24_000, audio.channels || 1);
}
