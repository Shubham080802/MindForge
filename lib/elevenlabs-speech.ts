import type { StudyLanguageCode } from "@/lib/study-languages";

export const ELEVENLABS_SPEECH_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";

/** Most lifelike of the multilingual models, and the reason for moving here. */
export const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";
/** "George" from the shared voice library: a warm, unhurried narrator. */
export const DEFAULT_ELEVENLABS_VOICE = "JBFqnCBsd6RMkjVDRZzb";
/** MP3 instead of raw PCM: roughly a twentieth of the bytes, and no byte order to get wrong. */
export const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";
export const ELEVENLABS_CONTENT_TYPE = "audio/mpeg";

/**
 * ElevenLabs does not list Latin among the languages any of its models
 * support, so it is spoken by approximation rather than properly.
 */
export const ELEVENLABS_UNSUPPORTED_LANGUAGES: readonly StudyLanguageCode[] = ["la"];

export interface VoiceModulation {
  /** Low is expressive and variable; high is flat and predictable. */
  stability: number;
  /** How closely the delivery tracks the original voice. */
  similarityBoost: number;
  /** Exaggerates the voice's characteristic delivery. Costs latency above 0. */
  style: number;
  /** Sharpens the resemblance to the source speaker. */
  useSpeakerBoost: boolean;
  /** 1 is the voice's natural pace. */
  speed: number;
}

/**
 * A lecturing voice wants some expressive range but must not wander: a
 * professor who re-reads the same sentence differently each time is
 * distracting. These defaults sit deliberately mid-scale.
 */
export const DEFAULT_VOICE_MODULATION: VoiceModulation = {
  stability: 0.45,
  similarityBoost: 0.8,
  style: 0.25,
  useSpeakerBoost: true,
  speed: 1,
};

type SpeechEnvironment = Record<string, string | undefined>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numeric(raw: string | undefined, fallback: number, min: number, max: number) {
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

export function resolveVoiceModulation(env: SpeechEnvironment = process.env): VoiceModulation {
  return {
    stability: numeric(env.ELEVENLABS_STABILITY, DEFAULT_VOICE_MODULATION.stability, 0, 1),
    similarityBoost: numeric(env.ELEVENLABS_SIMILARITY, DEFAULT_VOICE_MODULATION.similarityBoost, 0, 1),
    style: numeric(env.ELEVENLABS_STYLE, DEFAULT_VOICE_MODULATION.style, 0, 1),
    useSpeakerBoost: env.ELEVENLABS_SPEAKER_BOOST === undefined
      ? DEFAULT_VOICE_MODULATION.useSpeakerBoost
      : env.ELEVENLABS_SPEAKER_BOOST !== "false",
    // ElevenLabs rejects values outside this band.
    speed: numeric(env.ELEVENLABS_SPEED, DEFAULT_VOICE_MODULATION.speed, 0.7, 1.2),
  };
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  model: string;
  outputFormat: string;
  modulation: VoiceModulation;
}

export function getElevenLabsConfig(env: SpeechEnvironment = process.env): ElevenLabsConfig {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  return {
    apiKey,
    voiceId: env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_ELEVENLABS_VOICE,
    model: env.ELEVENLABS_MODEL?.trim() || DEFAULT_ELEVENLABS_MODEL,
    outputFormat: env.ELEVENLABS_OUTPUT_FORMAT?.trim() || DEFAULT_ELEVENLABS_OUTPUT_FORMAT,
    modulation: resolveVoiceModulation(env),
  };
}

export interface ElevenLabsSpeechRequest {
  text: string;
  model: string;
  modulation: VoiceModulation;
  languageCode?: string;
  /** Neighbouring chunks, so joins between them do not sound clipped. */
  previousText?: string;
  nextText?: string;
}

export function buildElevenLabsRequest({
  text,
  model,
  modulation,
  languageCode,
  previousText,
  nextText,
}: ElevenLabsSpeechRequest) {
  return {
    text,
    model_id: model,
    // multilingual_v2 infers the language and rejects an explicit code.
    ...(languageCode && model !== "eleven_multilingual_v2" ? { language_code: languageCode } : {}),
    ...(previousText ? { previous_text: previousText } : {}),
    ...(nextText ? { next_text: nextText } : {}),
    voice_settings: {
      stability: modulation.stability,
      similarity_boost: modulation.similarityBoost,
      style: modulation.style,
      use_speaker_boost: modulation.useSpeakerBoost,
      speed: modulation.speed,
    },
  };
}

export function elevenLabsFailure(status: number, body: string): Error {
  if (status === 401) return new Error("ElevenLabs rejected the API key.");
  if (status === 429) return new Error("ElevenLabs quota or rate limit reached. Please try again shortly.");
  if (status === 422) return new Error(`ElevenLabs could not read the request (${body.slice(0, 160)})`);
  return new Error(`ElevenLabs speech request failed (${status})`);
}

interface GenerateOptions extends Omit<ElevenLabsSpeechRequest, "model" | "modulation"> {
  config: ElevenLabsConfig;
  fetcher?: typeof fetch;
}

export async function generateElevenLabsSpeech({
  text,
  languageCode,
  previousText,
  nextText,
  config,
  fetcher = fetch,
}: GenerateOptions): Promise<Buffer> {
  const url = `${ELEVENLABS_SPEECH_ENDPOINT}/${encodeURIComponent(config.voiceId)}`
    + `?output_format=${encodeURIComponent(config.outputFormat)}`;

  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "xi-api-key": config.apiKey,
      "Content-Type": "application/json",
      Accept: ELEVENLABS_CONTENT_TYPE,
    },
    body: JSON.stringify(buildElevenLabsRequest({
      text,
      model: config.model,
      modulation: config.modulation,
      languageCode,
      previousText,
      nextText,
    })),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw elevenLabsFailure(response.status, await response.text().catch(() => ""));
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (!audio.byteLength) throw new Error("ElevenLabs returned no audio");
  return audio;
}
