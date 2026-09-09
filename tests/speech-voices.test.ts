import { describe, expect, it } from "vitest";
import { loadSpeechVoices, selectSpeechVoice } from "@/lib/speech-voices";

function voice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang } as SpeechSynthesisVoice;
}

describe("speech voice loading", () => {
  it("waits for an asynchronously loaded Hindi voice", async () => {
    const hindi = voice("Google हिन्दी", "hi-IN");
    const english = voice("Samantha", "en-US");
    let voices: SpeechSynthesisVoice[] = [english];
    const voiceChangeListeners: Array<() => void> = [];
    const source = {
      getVoices: () => voices,
      addEventListener: (_event: "voiceschanged", listener: () => void) => {
        voiceChangeListeners.push(listener);
      },
      removeEventListener: () => undefined,
    };

    const pending = loadSpeechVoices(source, {
      locale: "hi-IN",
      languageCode: "hi",
      timeoutMs: 50,
    });
    voices = [english, hindi];
    voiceChangeListeners[0]?.();

    await expect(pending).resolves.toEqual([english, hindi]);
  });

  it("selects Hindi instead of the default English voice", () => {
    const english = voice("Samantha", "en-US");
    const hindi = voice("Google हिन्दी", "hi-IN");

    expect(selectSpeechVoice([english, hindi], "hi-IN", "hi")).toBe(hindi);
  });

  it("matches browser voice tags that use underscores", () => {
    const hindi = voice("Hindi", "hi_IN");

    expect(selectSpeechVoice([hindi], "hi-IN", "hi")).toBe(hindi);
  });

  it("does not return an unrelated fallback voice", () => {
    const english = voice("Samantha", "en-US");

    expect(selectSpeechVoice([english], "hi-IN", "hi")).toBeNull();
  });
});
