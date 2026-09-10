const GEMINI_SPEECH_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
export const DEFAULT_SPEECH_MODEL = "gemini-3.1-flash-tts-preview";
export const FALLBACK_SPEECH_MODEL = "gemini-2.5-flash-preview-tts";

/**
 * Identifies how audio bytes are decoded. It is part of the speech cache key,
 * so audio stored by an earlier, incorrect decoding is never replayed.
 */
export const SPEECH_DECODE_SCHEME = "pcm-autodetect";

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

export function swapByteOrder(source: Uint8Array): Uint8Array {
  const pcm = Uint8Array.from(source);
  for (let index = 0; index + 1 < pcm.byteLength; index += 2) {
    const highByte = pcm[index]!;
    pcm[index] = pcm[index + 1]!;
    pcm[index + 1] = highByte;
  }
  return pcm;
}

/**
 * Fraction of adjacent samples that change sign, reading the bytes as 16-bit
 * little-endian. Speech sits around 0.1; the same bytes read in the wrong order
 * look like noise, close to 0.4, which is the "bzzzz" a listener hears.
 */
export function zeroCrossingRate(pcm: Uint8Array): number {
  const samples = Math.floor(pcm.byteLength / 2);
  if (samples < 2) return 0;

  const view = new DataView(pcm.buffer, pcm.byteOffset, samples * 2);
  let crossings = 0;
  let previous = view.getInt16(0, true);
  for (let index = 1; index < samples; index += 1) {
    const value = view.getInt16(index * 2, true);
    if ((value < 0) !== (previous < 0)) crossings += 1;
    previous = value;
  }
  return crossings / samples;
}

/** Roughly 40ms at 24kHz: below this there is no signal to judge. */
const MIN_SAMPLES_TO_DETECT = 1_000;

/**
 * Gemini has returned big-endian L16 under more than one mime label, and a
 * mislabelled response is inaudible rather than obviously broken -- the
 * listener just hears buzzing. So the label is only trusted when the payload
 * is too short to measure; otherwise the byte order that actually looks like
 * speech wins, which stays correct however a future model labels its output.
 */
export function toLittleEndianPcm(
  source: Uint8Array,
  mimeType?: string,
): { pcm: Uint8Array; swapped: boolean } {
  const declaredBigEndian = Boolean(mimeType?.toLowerCase().startsWith("audio/l16"));

  if (Math.floor(source.byteLength / 2) < MIN_SAMPLES_TO_DETECT) {
    return declaredBigEndian
      ? { pcm: swapByteOrder(source), swapped: true }
      : { pcm: source, swapped: false };
  }

  const swapped = swapByteOrder(source);
  return zeroCrossingRate(swapped) < zeroCrossingRate(source)
    ? { pcm: swapped, swapped: true }
    : { pcm: source, swapped: false };
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

  const { pcm } = toLittleEndianPcm(decoded, audio.mimeType);

  return pcmToWav(pcm, audio.sampleRate || 24_000, audio.channels || 1);
}
