import { describe, expect, it, vi } from "vitest";
import { getSpeechAudioUrl, playNativeAudio } from "@/lib/browser-audio";

describe("generated audio playback", () => {
  it("plays a same-origin speech stream through an audible native media element", async () => {
    let finish: (() => void) | null = null;
    let playing: (() => void) | null = null;
    const audio = {
      src: "",
      muted: true,
      volume: 0,
      preload: "none",
      onended: null as (() => void) | null,
      onplaying: null as (() => void) | null,
      onerror: null as (() => void) | null,
      error: null,
      play: vi.fn(async () => {
        playing?.();
        queueMicrotask(() => finish?.());
      }),
      pause: vi.fn(),
      load: vi.fn(),
    };
    Object.defineProperty(audio, "onended", {
      get: () => finish,
      set: (handler) => { finish = handler; },
    });
    Object.defineProperty(audio, "onplaying", {
      get: () => playing,
      set: (handler) => { playing = handler; },
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL");
    const src = getSpeechAudioUrl("session 1", "message/1", 0);

    await playNativeAudio(
      audio as unknown as HTMLAudioElement,
      src,
      new AbortController().signal,
    );

    expect(src).toBe("/api/sessions/session%201/messages/message%2F1/speech?chunkIndex=0");
    expect(audio.src).toBe(src);
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBe(1);
    expect(audio.preload).toBe("auto");
    expect(audio.play).toHaveBeenCalledOnce();
    expect(createObjectURL).not.toHaveBeenCalled();
    createObjectURL.mockRestore();
  });
});
