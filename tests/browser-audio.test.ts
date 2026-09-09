import { describe, expect, it, vi } from "vitest";
import { playDecodedAudio } from "@/lib/browser-audio";

describe("generated audio playback", () => {
  it("plays decoded audio without creating a blob URL", async () => {
    let finish: (() => void) | null = null;
    const source = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(() => queueMicrotask(() => finish?.())),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    Object.defineProperty(source, "onended", {
      get: () => finish,
      set: (handler) => { finish = handler; },
    });
    const context = {
      destination: {},
      decodeAudioData: vi.fn(async () => ({ duration: 1 })),
      createBufferSource: vi.fn(() => source),
    };
    const createObjectURL = vi.spyOn(URL, "createObjectURL");

    await playDecodedAudio(
      context as unknown as AudioContext,
      Uint8Array.from([1, 2, 3, 4]).buffer,
      new AbortController().signal,
    );

    expect(context.decodeAudioData).toHaveBeenCalledOnce();
    expect(source.connect).toHaveBeenCalledWith(context.destination);
    expect(source.start).toHaveBeenCalledOnce();
    expect(createObjectURL).not.toHaveBeenCalled();
    createObjectURL.mockRestore();
  });
});
