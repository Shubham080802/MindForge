const GEMINI_SPEECH_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
export const DEFAULT_SPEECH_MODEL = "gemini-3.1-flash-tts-preview";
export const SPEECH_CHUNK_LENGTH = 700;

type Fetcher = typeof fetch;

interface GenerateGeminiSpeechOptions {
  text: string;
  locale: string;
  apiKey: string;
  fetcher?: Fetcher;
}

export function buildGeminiSpeechRequest(text: string, locale: string) {
  return {
    model: DEFAULT_SPEECH_MODEL,
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

export function splitSpeechText(text: string, maxLength = SPEECH_CHUNK_LENGTH): string[] {
  if (maxLength < 1) throw new Error("Speech chunk length must be positive");
  const normalized = text.replaceAll(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    if (word.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let offset = 0; offset < word.length; offset += maxLength) {
        chunks.push(word.slice(offset, offset + maxLength));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function prepareSpeechText(text: string): string {
  return text
    .replaceAll(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replaceAll(/[[(]Material\s+\d+[\])]/gi, "")
    .replaceAll(/^\s*#{1,6}\s+/gm, "")
    .replaceAll(/^\s*[-+*]\s+/gm, "")
    .replaceAll(/[*_`>]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export async function generateGeminiSpeech({
  text,
  locale,
  apiKey,
  fetcher = fetch,
}: GenerateGeminiSpeechOptions): Promise<Buffer> {
  const response = await fetcher(GEMINI_SPEECH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(buildGeminiSpeechRequest(text, locale)),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json() as {
    output_audio?: { data?: string };
    outputAudio?: { data?: string };
    error?: { status?: string };
  };

  if (!response.ok) {
    throw new Error(`Gemini speech request failed (${body.error?.status || response.status})`);
  }

  const encodedAudio = body.output_audio?.data ?? body.outputAudio?.data;
  if (!encodedAudio) throw new Error("Gemini speech returned no audio");

  return pcmToWav(Buffer.from(encodedAudio, "base64"));
}
