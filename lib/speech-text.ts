export const SPEECH_CHUNK_LENGTH = 700;

export function splitSpeechText(text: string, maxLength = SPEECH_CHUNK_LENGTH): string[] {
  if (maxLength < 1) throw new Error("Speech chunk length must be positive");
  const normalized = text.replaceAll(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    if (word.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let offset = 0; offset < word.length; offset += maxLength) {
        chunks.push(word.slice(offset, offset + maxLength));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLength) {
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
