import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ELEVENLABS_MODEL,
  DEFAULT_ELEVENLABS_VOICE,
  DEFAULT_VOICE_MODULATION,
  buildElevenLabsRequest,
  chunkContextEnabled,
  elevenLabsFailure,
  generateElevenLabsSpeech,
  getElevenLabsConfig,
  resolveVoiceModulation,
} from "@/lib/elevenlabs-speech";
import { resolveSpeechProvider, speechCacheScheme, speechContentType } from "@/lib/speech-provider";

const KEY = { ELEVENLABS_API_KEY: "el-test-key" };

describe("resolveVoiceModulation", () => {
  it("uses professor-appropriate defaults", () => {
    expect(resolveVoiceModulation({})).toEqual(DEFAULT_VOICE_MODULATION);
  });

  it("reads modulation from the environment", () => {
    const modulation = resolveVoiceModulation({
      ELEVENLABS_STABILITY: "0.2",
      ELEVENLABS_SIMILARITY: "0.9",
      ELEVENLABS_STYLE: "0.6",
      ELEVENLABS_SPEED: "0.95",
      ELEVENLABS_SPEAKER_BOOST: "false",
    });

    expect(modulation).toEqual({
      stability: 0.2,
      similarityBoost: 0.9,
      style: 0.6,
      useSpeakerBoost: false,
      speed: 0.95,
    });
  });

  it("clamps values ElevenLabs would reject", () => {
    const modulation = resolveVoiceModulation({
      ELEVENLABS_STABILITY: "5",
      ELEVENLABS_STYLE: "-3",
      ELEVENLABS_SPEED: "4",
    });

    expect(modulation.stability).toBe(1);
    expect(modulation.style).toBe(0);
    expect(modulation.speed).toBe(1.2);
  });

  it("ignores values that are not numbers", () => {
    expect(resolveVoiceModulation({ ELEVENLABS_SPEED: "fast" }).speed)
      .toBe(DEFAULT_VOICE_MODULATION.speed);
  });
});

describe("getElevenLabsConfig", () => {
  it("requires a key", () => {
    expect(() => getElevenLabsConfig({})).toThrow(/ELEVENLABS_API_KEY/);
  });

  it("defaults the voice, model and format", () => {
    const config = getElevenLabsConfig(KEY);

    expect(config.voiceId).toBe(DEFAULT_ELEVENLABS_VOICE);
    expect(config.model).toBe(DEFAULT_ELEVENLABS_MODEL);
    expect(config.outputFormat).toBe("mp3_44100_128");
  });

  // Half the price per character, which doubles a small credit allowance.
  it("defaults to the cheaper, faster Flash model", () => {
    expect(DEFAULT_ELEVENLABS_MODEL).toBe("eleven_flash_v2_5");
  });

  it("allows trading quota for multilingual v2", () => {
    expect(getElevenLabsConfig({ ...KEY, ELEVENLABS_MODEL: "eleven_multilingual_v2" }).model)
      .toBe("eleven_multilingual_v2");
  });
});

describe("buildElevenLabsRequest", () => {
  const base = { text: "Mitochondria make ATP.", modulation: DEFAULT_VOICE_MODULATION };

  it("sends the text, model and voice settings", () => {
    const body = buildElevenLabsRequest({ ...base, model: DEFAULT_ELEVENLABS_MODEL });

    expect(body.text).toBe("Mitochondria make ATP.");
    expect(body.model_id).toBe(DEFAULT_ELEVENLABS_MODEL);
    expect(body.voice_settings).toEqual({
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.25,
      use_speaker_boost: true,
      speed: 1,
    });
  });

  // multilingual_v2 rejects an explicit language code.
  it("omits the language code for multilingual v2", () => {
    const body = buildElevenLabsRequest({ ...base, model: "eleven_multilingual_v2", languageCode: "hi" });

    expect(body).not.toHaveProperty("language_code");
  });

  it("sends the language code for models that accept one", () => {
    const body = buildElevenLabsRequest({ ...base, model: "eleven_flash_v2_5", languageCode: "hi" });

    expect(body).toHaveProperty("language_code", "hi");
  });

  it("passes neighbouring chunks so joins do not sound clipped", () => {
    const body = buildElevenLabsRequest({
      ...base,
      model: DEFAULT_ELEVENLABS_MODEL,
      previousText: "Before.",
      nextText: "After.",
    });

    expect(body).toMatchObject({ previous_text: "Before.", next_text: "After." });
  });

  it("omits neighbours at the start and end of a reply", () => {
    const body = buildElevenLabsRequest({ ...base, model: DEFAULT_ELEVENLABS_MODEL });

    expect(body).not.toHaveProperty("previous_text");
    expect(body).not.toHaveProperty("next_text");
  });
});

describe("generateElevenLabsSpeech", () => {
  it("posts to the configured voice and returns the audio", async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));

    const audio = await generateElevenLabsSpeech({
      text: "Hello",
      config: getElevenLabsConfig(KEY),
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(Array.from(audio)).toEqual([1, 2, 3]);
    const [url, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toContain(`/${DEFAULT_ELEVENLABS_VOICE}?output_format=mp3_44100_128`);
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("el-test-key");
  });

  it("reports an empty response rather than caching silence", async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([]), { status: 200 }));

    await expect(generateElevenLabsSpeech({
      text: "Hello",
      config: getElevenLabsConfig(KEY),
      fetcher: fetcher as unknown as typeof fetch,
    })).rejects.toThrow(/no audio/);
  });

  it("explains a rejected key and an exhausted quota differently", async () => {
    expect(elevenLabsFailure(401, "").message).toMatch(/API key/);
    expect(elevenLabsFailure(429, "").message).toMatch(/quota or rate limit/);
    expect(elevenLabsFailure(500, "").message).toMatch(/failed \(500\)/);
  });
});

describe("chunkContextEnabled", () => {
  it("is off by default, so unmeasured context cannot quietly cost credits", () => {
    expect(chunkContextEnabled({})).toBe(false);
  });

  it("can be opted into", () => {
    expect(chunkContextEnabled({ ELEVENLABS_CHUNK_CONTEXT: "true" })).toBe(true);
  });
});

describe("resolveSpeechProvider", () => {
  it("stays on Gemini until a key exists", () => {
    expect(resolveSpeechProvider({})).toBe("gemini");
  });

  it("switches to ElevenLabs once the key is present", () => {
    expect(resolveSpeechProvider(KEY)).toBe("elevenlabs");
  });

  it("allows an explicit fall back to Gemini", () => {
    expect(resolveSpeechProvider({ ...KEY, SPEECH_PROVIDER: "gemini" })).toBe("gemini");
  });

  it("never selects ElevenLabs without a key, even when asked", () => {
    expect(resolveSpeechProvider({ SPEECH_PROVIDER: "elevenlabs" })).toBe("gemini");
  });
});

describe("speech cache identity", () => {
  it("serves MP3 for ElevenLabs and WAV for Gemini", () => {
    expect(speechContentType("elevenlabs")).toBe("audio/mpeg");
    expect(speechContentType("gemini")).toBe("audio/wav");
  });

  it("changes when the voice changes, so old audio is not replayed", () => {
    const first = speechCacheScheme("elevenlabs", KEY);
    const second = speechCacheScheme("elevenlabs", { ...KEY, ELEVENLABS_VOICE_ID: "other-voice" });

    expect(first).not.toBe(second);
  });

  it("changes when modulation changes", () => {
    const first = speechCacheScheme("elevenlabs", KEY);
    const second = speechCacheScheme("elevenlabs", { ...KEY, ELEVENLABS_STABILITY: "0.9" });

    expect(first).not.toBe(second);
  });

  it("keeps providers in separate namespaces", () => {
    expect(speechCacheScheme("gemini", KEY)).not.toContain("elevenlabs");
  });
});
