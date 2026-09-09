interface SpeechVoiceSource {
  getVoices: () => SpeechSynthesisVoice[];
  addEventListener: (type: "voiceschanged", listener: () => void) => void;
  removeEventListener: (type: "voiceschanged", listener: () => void) => void;
}

interface LoadSpeechVoiceOptions {
  locale?: string;
  languageCode?: string;
  timeoutMs?: number;
}

export function loadSpeechVoices(
  source: SpeechVoiceSource,
  options: LoadSpeechVoiceOptions = {},
): Promise<SpeechSynthesisVoice[]> {
  const { locale, languageCode, timeoutMs = 1_500 } = options;
  const hasRequestedVoice = (voices: SpeechSynthesisVoice[]) => (
    !locale || !languageCode || selectSpeechVoice(voices, locale, languageCode) !== null
  );
  const existingVoices = source.getVoices();
  if (existingVoices.length > 0 && hasRequestedVoice(existingVoices)) {
    return Promise.resolve(existingVoices);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      source.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(voices);
    };

    const handleVoicesChanged = () => {
      const voices = source.getVoices();
      if (voices.length > 0 && hasRequestedVoice(voices)) finish(voices);
    };

    const timeout = setTimeout(() => finish(source.getVoices()), timeoutMs);
    source.addEventListener("voiceschanged", handleVoicesChanged);
  });
}

export function selectSpeechVoice(
  voices: SpeechSynthesisVoice[],
  locale: string,
  languageCode: string,
): SpeechSynthesisVoice | null {
  const normalizeLanguageTag = (value: string) => value.toLowerCase().replaceAll("_", "-");
  const normalizedLocale = normalizeLanguageTag(locale);
  const normalizedCode = normalizeLanguageTag(languageCode);

  return voices.find((voice) => normalizeLanguageTag(voice.lang) === normalizedLocale)
    ?? voices.find((voice) => {
      const voiceLanguage = normalizeLanguageTag(voice.lang);
      return voiceLanguage === normalizedCode || voiceLanguage.startsWith(`${normalizedCode}-`);
    })
    ?? null;
}

export function getSpeechErrorNotice(errorCode: string, languageName: string): string | null {
  if (errorCode === "canceled" || errorCode === "interrupted") return null;

  if (errorCode === "language-unavailable" || errorCode === "voice-unavailable") {
    return `${languageName} voice playback became unavailable. Refresh the page and try again.`;
  }

  if (errorCode === "not-allowed") {
    return `Allow audio playback in this browser to read the ${languageName} response aloud.`;
  }

  if (errorCode === "audio-busy" || errorCode === "audio-hardware") {
    return `Your audio device is currently unavailable. Close other audio playback and try ${languageName} read-aloud again.`;
  }

  return `${languageName} read-aloud failed (${errorCode || "unknown error"}). Please try again.`;
}
