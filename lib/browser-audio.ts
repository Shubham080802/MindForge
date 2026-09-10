export function getSpeechAudioUrl(sessionId: string, messageId: string, chunkIndex: number): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}/speech?chunkIndex=${chunkIndex}`;
}

async function failureMessage(response: Response): Promise<string> {
  if (response.status === 429) return "Professor audio has hit its rate limit. Please try again in a minute.";
  const body = await response.json().catch(() => null);
  const message = body && typeof body === "object" && "message" in body
    ? String((body as { message?: unknown }).message ?? "")
    : "";
  return message || "Professor audio could not be generated.";
}

/**
 * Fetches a speech chunk and plays it from an object URL.
 *
 * Handing the endpoint straight to the media element looks simpler, but
 * Chrome's media loader stalls on it indefinitely -- readyState stays at 0
 * while the very same URL returns its bytes to fetch() in under a second. Going
 * through fetch keeps playback on the path that demonstrably works, and it also
 * surfaces a real server message (a rate limit, say) instead of an opaque media
 * error. Object URLs require `media-src blob:` in the Content-Security-Policy.
 */
export async function playNativeAudio(
  audio: HTMLAudioElement,
  src: string,
  signal: AbortSignal,
  onPlaying?: () => void,
): Promise<void> {
  if (signal.aborted) return;

  const response = await fetch(src, { credentials: "include", signal });
  if (!response.ok) throw new Error(await failureMessage(response));

  const blob = await response.blob();
  if (signal.aborted) return;

  const objectUrl = URL.createObjectURL(blob);

  try {
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
        audio.error?.message || "Professor audio could not be played",
      ));
      audio.preload = "auto";
      audio.muted = false;
      audio.volume = 1;
      audio.src = objectUrl;
      audio.load();
      void audio.play().catch(fail);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
