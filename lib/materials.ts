import crypto from "node:crypto";
import mammoth from "mammoth";
import pdf from "pdf-parse";

const acceptedTypes = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function assertAcceptedUpload(file: File, maxBytes: number) {
  if (!acceptedTypes.has(file.type)) throw new Response("Unsupported file type", { status: 415 });
  if (!file.size || file.size > maxBytes) throw new Response("File is too large", { status: 413 });
  if (file.name.length > 255) throw new Response("Invalid file name", { status: 400 });
}

export function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function privateObjectPath(ownerId: string, materialId: string) {
  return `${ownerId}/${materialId}/${crypto.randomUUID()}`;
}

export async function extractText(file: File, buffer: Buffer) {
  if (file.type === "text/plain" || file.type === "text/markdown") return buffer.toString("utf8");
  if (file.type === "application/pdf") return (await pdf(buffer)).text;
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return (await mammoth.extractRawText({ buffer })).value;
  }
  throw new Response("Unsupported file type", { status: 415 });
}

export function chunkText(text: string, maxLength = 1_800, overlap = 200) {
  const normalized = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < normalized.length) {
    let end = Math.min(cursor + maxLength, normalized.length);
    if (end < normalized.length) {
      const boundary = normalized.lastIndexOf("\n", end) > cursor + maxLength / 2
        ? normalized.lastIndexOf("\n", end)
        : normalized.lastIndexOf(" ", end);
      if (boundary > cursor + maxLength / 2) end = boundary;
    }
    chunks.push(normalized.slice(cursor, end).trim());
    cursor = end - overlap;
    if (cursor <= 0 || end === normalized.length) break;
  }
  return chunks.filter(Boolean);
}
