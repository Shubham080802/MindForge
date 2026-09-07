import type { Prisma } from "@prisma/client";
import mammoth from "mammoth";
import pdf from "pdf-parse";
import { createWorker } from "tesseract.js";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 5;
const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function materialType(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return "document";
}

async function extractText(buffer: Buffer, mimeType: string) {
  if (mimeType === "text/plain" || mimeType === "text/markdown") return buffer.toString("utf8");
  if (mimeType === "application/pdf") return (await pdf(buffer)).text;
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return (await mammoth.extractRawText({ buffer })).value;
  }
  const worker = await createWorker("eng");
  try {
    return (await worker.recognize(buffer)).data.text;
  } finally {
    await worker.terminate();
  }
}

export function validateMaterialBatch(files: File[]) {
  if (!files.length || files.length > MAX_FILES_PER_UPLOAD) {
    throw new Response(`Upload between 1 and ${MAX_FILES_PER_UPLOAD} files.`, { status: 400 });
  }
  for (const file of files) {
    if (!ACCEPTED_TYPES.has(file.type) || !file.size || file.size > MAX_FILE_BYTES || file.name.length > 255) {
      throw new Response("One or more files are unsupported or too large.", { status: 415 });
    }
  }
}

export async function prepareMaterialBatch(files: File[], userId: string, sessionId: string | null) {
  const prepared: Prisma.MaterialUncheckedCreateInput[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = (await extractText(buffer, file.type)).replace(/\0/g, "").trim();
    if (!extractedText) throw new Response(`${file.name} does not contain readable text.`, { status: 422 });
    prepared.push({
      userId,
      sessionId,
      fileName: file.name,
      type: materialType(file.type),
      url: "",
      mimeType: file.type,
      size: file.size,
      fileContent: buffer,
      extractedText: extractedText.slice(0, 50_000),
    });
  }
  return prepared;
}
