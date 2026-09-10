export const SPEECH_CHUNK_LENGTH = 700;

/**
 * Nothing can play until the first chunk finishes generating, and Gemini's
 * generation time scales with the text it is given: a 700-character chunk
 * measured at roughly 16 seconds in production. A short lead chunk gets the
 * professor talking in a few seconds, and every later chunk is prefetched
 * while the previous one plays, so their length no longer costs the listener
 * anything.
 */
export const SPEECH_LEAD_CHUNK_LENGTH = 200;

/**
 * Identifies the current chunk boundaries. Cached audio is stored per chunk
 * index, so audio generated under different boundaries must never be served
 * against a new index. Change this whenever the lengths above change.
 */
export const SPEECH_CHUNK_SCHEME = "lead200";

export function splitSpeechText(
  text: string,
  maxLength = SPEECH_CHUNK_LENGTH,
  leadLength = SPEECH_LEAD_CHUNK_LENGTH,
): string[] {
  if (maxLength < 1 || leadLength < 1) throw new Error("Speech chunk length must be positive");
  const normalized = text.replaceAll(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let current = "";
  const limit = () => (chunks.length === 0 ? Math.min(leadLength, maxLength) : maxLength);

  for (const word of normalized.split(" ")) {
    if (word.length > limit()) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      let offset = 0;
      while (offset < word.length) {
        const size = limit();
        chunks.push(word.slice(offset, offset + size));
        offset += size;
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > limit()) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function prepareSpeechText(text: string): string {
  return text
    .replaceAll(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replaceAll(/[[(]Material\s+\d+[\])]/gi, "")
    .replaceAll(/^\s*#{1,6}\s+/gm, "")
    .replaceAll(/^\s*[-+*]\s+/gm, "")
    .replaceAll(/[*_`>]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();
}
