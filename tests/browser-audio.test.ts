import { describe, expect, it, vi } from "vitest";
import { getSpeechAudioUrl, playNativeAudio } from "@/lib/browser-audio";

function fakeAudio() {
  let finish: (() => void) | null = null;
  let playing: (() => void) | null = null;
  const audio = {
    src: "",
    muted: true,
    volume: 0,
    preload: "none",
    onerror: null as (() => void) | null,
    error: null,
    play: vi.fn(async () => {
      playing?.();
      queueMicrotask(() => finish?.());
    }),
    pause: vi.fn(),
    load: vi.fn(),
  };
  Object.defineProperty(audio, "onended", { get: () => finish, set: (h) => { finish = h; } });
  Object.defineProperty(audio, "onplaying", { get: () => playing, set: (h) => { playing = h; } });
  return audio;
}

function stubObjectUrl() {
  const created: Blob[] = [];
  const revoked: string[] = [];
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    created.push(blob as Blob);
    return "blob:mindforge/chunk";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => { revoked.push(url); });
  return { created, revoked };
}

describe("getSpeechAudioUrl", () => {
  it("encodes identifiers into the chunk URL", () => {
    expect(getSpeechAudioUrl("session 1", "message/1", 0))
      .toBe("/api/sessions/session%201/messages/message%2F1/speech?chunkIndex=0");
  });
});

describe("playNativeAudio", () => {
  it("plays fetched audio from an object URL and releases it afterwards", async () => {
    const { created, revoked } = stubObjectUrl();
    const audio = fakeAudio();
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "audio/wav" },
    }));
    vi.stubGlobal("fetch", fetcher);

    await playNativeAudio(audio as unknown as HTMLAudioElement, "/speech?chunkIndex=0", new AbortController().signal);

    expect(fetcher).toHaveBeenCalledWith("/speech?chunkIndex=0", expect.objectContaining({ credentials: "include" }));
    expect(created).toHaveLength(1);
    expect(audio.src).toBe("blob:mindforge/chunk");
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBe(1);
    expect(audio.preload).toBe("auto");
    expect(audio.play).toHaveBeenCalledOnce();
    expect(revoked).toEqual(["blob:mindforge/chunk"]);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports the server's reason instead of an opaque media error", async () => {
    stubObjectUrl();
    const audio = fakeAudio();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ message: "Professor response not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    )));

    await expect(playNativeAudio(audio as unknown as HTMLAudioElement, "/speech", new AbortController().signal))
      .rejects.toThrow("Professor response not found");
    expect(audio.play).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("explains a rate limit in words a learner can act on", async () => {
    stubObjectUrl();
    const audio = fakeAudio();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));

    await expect(playNativeAudio(audio as unknown as HTMLAudioElement, "/speech", new AbortController().signal))
      .rejects.toThrow(/rate limit/i);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not fetch when already aborted", async () => {
    stubObjectUrl();
    const audio = fakeAudio();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const controller = new AbortController();
    controller.abort();

    await playNativeAudio(audio as unknown as HTMLAudioElement, "/speech", controller.signal);

    expect(fetcher).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
