export function getSpeechAudioUrl(sessionId: string, messageId: string, chunkIndex: number): string {
  return `/api/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}/speech?chunkIndex=${chunkIndex}`;
}

async function failureMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null);
  const message = body && typeof body === "object" && "message" in body
    ? String((body as { message?: unknown }).message ?? "")
    : "";

  if (message) return message;
  if (response.status === 429) return "Too many audio requests. Please wait a minute and try again.";
  return `Professor audio could not be generated (HTTP ${response.status}).`;
}

/**
 * Fetches a speech chunk, then plays it from an object URL.
 *
 * Assigning the endpoint straight to `audio.src` looks simpler but throws away
 * the reason for any failure: the server answers a provider outage with a JSON
 * 502 explaining itself, and a media element handed JSON can only report
 * "source not supported". Every distinct cause -- exhausted credits, a rejected
 * key, an unsupported voice -- collapses into one useless message.
 *
 * Fetching first keeps that explanation. Object URLs require `media-src blob:`
 * in the Content-Security-Policy.
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
  if (!blob.size) throw new Error("Professor audio came back empty. Please try again.");

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
        `This browser could not play the audio format (${blob.type || "unknown"}).`,
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
