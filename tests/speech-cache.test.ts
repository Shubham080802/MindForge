import { describe, expect, it, vi } from "vitest";
import { getOrCreateSpeechAudio, type SpeechAudioStore } from "@/lib/speech-cache";

describe("speech audio cache", () => {
  it("reuses generated message audio instead of spending free-tier quota again", async () => {
    const entries = new Map<string, Uint8Array>();
    const store: SpeechAudioStore = {
      read: async (key) => entries.get(JSON.stringify(key)) ?? null,
      write: async (key, audio) => { entries.set(JSON.stringify(key), audio); },
    };
    const generate = vi.fn(async () => Uint8Array.from([82, 73, 70, 70]));
    const key = { messageId: "message-1", chunkIndex: 0, model: "tts-model" };

    const first = await getOrCreateSpeechAudio(store, key, generate);
    const second = await getOrCreateSpeechAudio(store, key, generate);

    expect(first.cacheStatus).toBe("MISS");
    expect(second.cacheStatus).toBe("HIT");
    expect([...second.audio]).toEqual([82, 73, 70, 70]);
    expect(generate).toHaveBeenCalledOnce();
  });
});
