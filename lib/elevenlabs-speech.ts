import type { StudyLanguageCode } from "@/lib/study-languages";

export const ELEVENLABS_SPEECH_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";

/**
 * Flash rather than Multilingual v2: half the price per character ($0.05 vs
 * $0.10 per 1K) and ~75ms instead of seconds, across a superset of the same
 * languages. On a 10,000-credit allowance that is the difference between about
 * eight professor replies and about fifteen. Set ELEVENLABS_MODEL to
 * "eleven_multilingual_v2" to trade half the quota for its longer-form
 * stability.
 */
export const DEFAULT_ELEVENLABS_MODEL = "eleven_flash_v2_5";
/** "George" from the shared voice library: a warm, unhurried narrator. */
export const DEFAULT_ELEVENLABS_VOICE = "JBFqnCBsd6RMkjVDRZzb";

/**
 * Per-language voices. A voice recorded by a native speaker reads its own
 * language far better than a multilingual model bending one voice to fit, so
 * the professor changes voice with the explanation language.
 *
 * Voice identifiers are public, not credentials. Override without a deploy
 * using ELEVENLABS_VOICE_MAP, e.g. "hi=<id>,zh=<id>,default=<id>".
 */
export const DEFAULT_LANGUAGE_VOICES: Partial<Record<StudyLanguageCode, string>> = {};
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

/** Parses "hi=abc,zh=def,default=ghi" into a lookup, ignoring malformed entries. */
export function parseVoiceMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};

  const map: Record<string, string> = {};
  for (const entry of raw.split(",")) {
    const [key, value] = entry.split("=");
    const language = key?.trim().toLowerCase();
    const voice = value?.trim();
    if (language && voice) map[language] = voice;
  }
  return map;
}

export function resolveVoiceForLanguage(
  language: StudyLanguageCode,
  env: SpeechEnvironment = process.env,
): string {
  const configured = parseVoiceMap(env.ELEVENLABS_VOICE_MAP);

  return configured[language]
    ?? DEFAULT_LANGUAGE_VOICES[language]
    ?? configured.default
    ?? env.ELEVENLABS_VOICE_ID?.trim()
    ?? DEFAULT_LANGUAGE_VOICES.en
    ?? DEFAULT_ELEVENLABS_VOICE;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  model: string;
  outputFormat: string;
  modulation: VoiceModulation;
}

export function getElevenLabsConfig(
  env: SpeechEnvironment = process.env,
  language: StudyLanguageCode = "en",
): ElevenLabsConfig {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  return {
    apiKey,
    voiceId: resolveVoiceForLanguage(language, env),
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

/**
 * ElevenLabs recommends previous_text/next_text to keep prosody natural across
 * split text, but does not document whether that context is billed. On a small
 * credit allowance a silent tripling of cost is the worse risk, so this stays
 * off until someone opts in and watches their usage.
 */
export function chunkContextEnabled(env: SpeechEnvironment = process.env): boolean {
  return env.ELEVENLABS_CHUNK_CONTEXT === "true";
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

/**
 * A provider failure whose reason is safe to show the learner. "Out of credits"
 * and "the key is wrong" are things the operator needs to see immediately, and
 * a generic 500 hides exactly the information that makes them fixable. Carries
 * no key, no URL and no provider response body.
 */
export class SpeechProviderError extends Error {
  constructor(message: string, readonly providerStatus: number) {
    super(message);
    this.name = "SpeechProviderError";
  }
}

export function elevenLabsFailure(status: number, body: string): SpeechProviderError {
  if (status === 401) {
    return new SpeechProviderError("The ElevenLabs API key was rejected. Check it in the deployment settings.", status);
  }
  if (status === 429) {
    return new SpeechProviderError("ElevenLabs credits are exhausted or the rate limit was hit. Read-aloud will work again once quota is available.", status);
  }
  if (status === 422) {
    return new SpeechProviderError(`ElevenLabs rejected the request (${body.slice(0, 120)})`, status);
  }
  return new SpeechProviderError(`ElevenLabs could not generate audio (HTTP ${status}).`, status);
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
  if (!audio.byteLength) throw new SpeechProviderError("ElevenLabs returned no audio.", 200);
  return audio;
}
