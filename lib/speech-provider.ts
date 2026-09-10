import { DEFAULT_SPEECH_MODEL, SPEECH_DECODE_SCHEME } from "@/lib/gemini-speech";
import { ELEVENLABS_CONTENT_TYPE, getElevenLabsConfig } from "@/lib/elevenlabs-speech";

export type SpeechProviderName = "elevenlabs" | "gemini";

type SpeechEnvironment = Record<string, string | undefined>;

/**
 * ElevenLabs is preferred when a key is present, and Gemini remains the
 * fallback. Selection follows the key rather than a separate switch so the
 * provider can never be pointed at credentials that do not exist -- adding the
 * key turns it on, removing it turns it back off, and neither leaves a
 * half-configured state that only fails at playback.
 */
export function resolveSpeechProvider(env: SpeechEnvironment = process.env): SpeechProviderName {
  const requested = env.SPEECH_PROVIDER?.trim().toLowerCase();
  const hasElevenLabsKey = Boolean(env.ELEVENLABS_API_KEY?.trim());

  if (requested === "gemini") return "gemini";
  if (requested === "elevenlabs" && hasElevenLabsKey) return "elevenlabs";
  return hasElevenLabsKey ? "elevenlabs" : "gemini";
}

export function speechContentType(provider: SpeechProviderName): string {
  return provider === "elevenlabs" ? ELEVENLABS_CONTENT_TYPE : "audio/wav";
}

/**
 * Identifies everything that changes the produced audio. It is part of the
 * cache key, so switching provider, voice, model, or modulation regenerates
 * rather than replaying audio a listener would notice is different.
 */
export function speechCacheScheme(
  provider: SpeechProviderName,
  env: SpeechEnvironment = process.env,
): string {
  if (provider === "gemini") return `${DEFAULT_SPEECH_MODEL}:${SPEECH_DECODE_SCHEME}`;

  const { voiceId, model, modulation } = getElevenLabsConfig(env);
  const shape = [
    modulation.stability,
    modulation.similarityBoost,
    modulation.style,
    modulation.speed,
    modulation.useSpeakerBoost ? 1 : 0,
  ].join("-");

  return `elevenlabs:${model}:${voiceId}:${shape}`;
}
