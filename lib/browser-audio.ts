export function getSpeechAudioUrl(sessionId: string, messageId: string, chunkIndex: number): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}/speech?chunkIndex=${chunkIndex}`;
}

export async function playNativeAudio(
  audio: HTMLAudioElement,
  src: string,
  signal: AbortSignal,
  onPlaying?: () => void,
): Promise<void> {
  if (signal.aborted) return;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      signal.removeEventListener("abort", handleAbort);
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleAbort = () => {
      audio.pause();
      finish();
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    audio.onended = finish;
    audio.onplaying = onPlaying || null;
    audio.onerror = () => fail(new Error(
      audio.error?.code === 4
        ? "Professor audio is temporarily unavailable. Please try again in a minute."
        : audio.error?.message || "Professor audio could not be played",
    ));
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = 1;
    audio.src = src;
    audio.load();
    void audio.play().catch(fail);
  });
}
