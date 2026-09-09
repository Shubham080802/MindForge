export interface SpeechAudioKey {
  messageId: string;
  chunkIndex: number;
  model: string;
}

export interface SpeechAudioStore {
  read(key: SpeechAudioKey): Promise<Uint8Array | null>;
  write(key: SpeechAudioKey, audio: Uint8Array): Promise<void>;
}

export async function getOrCreateSpeechAudio(
  store: SpeechAudioStore,
  key: SpeechAudioKey,
  generate: () => Promise<Uint8Array>,
): Promise<{ audio: Uint8Array; cacheStatus: "HIT" | "MISS" }> {
  const cached = await store.read(key);
  if (cached) return { audio: cached, cacheStatus: "HIT" };

  const audio = await generate();
  await store.write(key, audio);
  return { audio, cacheStatus: "MISS" };
}
