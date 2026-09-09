export async function playDecodedAudio(
  context: AudioContext,
  data: ArrayBuffer,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;

  const decoded = await context.decodeAudioData(data.slice(0));
  if (signal.aborted) return;

  const source = context.createBufferSource();
  source.buffer = decoded;
  source.connect(context.destination);

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", handleAbort);
      source.onended = null;
      resolve();
    };
    const handleAbort = () => {
      try {
        source.stop();
      } catch {
        // A source that already ended cannot be stopped again.
      }
      finish();
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    source.onended = finish;

    try {
      source.start();
    } catch (error) {
      signal.removeEventListener("abort", handleAbort);
      reject(error);
    }
  });
}
