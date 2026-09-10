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
  const revoked: string[] = [];
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mindforge/chunk");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => { revoked.push(url); });
  return revoked;
}

function play(audio: ReturnType<typeof fakeAudio>, signal = new AbortController().signal) {
  return playNativeAudio(audio as unknown as HTMLAudioElement, "/speech?chunkIndex=0", signal);
}

describe("getSpeechAudioUrl", () => {
  it("encodes identifiers into the chunk URL", () => {
    expect(getSpeechAudioUrl("session 1", "message/1", 0))
      .toBe("/api/sessions/session%201/messages/message%2F1/speech?chunkIndex=0");
  });
});

describe("playNativeAudio", () => {
  it("plays fetched audio from an object URL and releases it", async () => {
    const revoked = stubObjectUrl();
    const audio = fakeAudio();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    })));

    await play(audio);

    expect(audio.src).toBe("blob:mindforge/chunk");
    expect(audio.muted).toBe(false);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(revoked).toEqual(["blob:mindforge/chunk"]);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // The failure this whole approach exists for: a media element handed a JSON
  // 502 can only say "source not supported", losing the actual reason.
  it("surfaces the provider's reason from a failed response", async () => {
    stubObjectUrl();
    const audio = fakeAudio();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ message: "ElevenLabs credits are exhausted or the rate limit was hit." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    )));

    await expect(play(audio)).rejects.toThrow(/credits are exhausted/);
    expect(audio.play).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("explains a rate limit that carries no body", async () => {
    stubObjectUrl();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));

    await expect(play(fakeAudio())).rejects.toThrow(/wait a minute/i);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to the status when a failure has no message", async () => {
    stubObjectUrl();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));

    await expect(play(fakeAudio())).rejects.toThrow(/HTTP 500/);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects an empty body rather than playing silence", async () => {
    stubObjectUrl();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([]), { status: 200 })));

    await expect(play(fakeAudio())).rejects.toThrow(/came back empty/);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("names the format when the browser cannot decode it", async () => {
    stubObjectUrl();
    const audio = fakeAudio();
    audio.play = vi.fn(async () => { audio.onerror?.(); });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    })));

    await expect(play(audio)).rejects.toThrow(/could not play the audio format/);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not fetch when already aborted", async () => {
    stubObjectUrl();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const controller = new AbortController();
    controller.abort();

    await play(fakeAudio(), controller.signal);

    expect(fetcher).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
