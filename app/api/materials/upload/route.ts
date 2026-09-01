import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { createWorker } from "tesseract.js";

export const runtime = "nodejs";

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const data = await pdfParse.default(buffer);
    return data.text || "";
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "[PDF text extraction failed]";
  }
}

async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const worker = await createWorker("eng");
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    return text.trim() || `[Image: No text detected]`;
  } catch (error) {
    console.error("OCR error:", error);
    return `[Image: OCR failed]`;
  }
}

async function extractTextFromDocument(buffer: Buffer, mimeType: string): Promise<string> {
  // Handle Word documents, Markdown, etc.
  if (mimeType === "application/msword" || 
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    // For .doc and .docx files, return placeholder for now
    return "[Word document: Text extraction requires additional library]";
  }
  // For markdown, txt, and other text-based formats
  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "text/markdown") {
    return buffer.toString("utf-8");
  }
  return `[Document: ${mimeType} - text extraction not yet implemented]`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const sessionId = formData.get("sessionId") as string | null;

    if (!files.length) {
      return NextResponse.json({ message: "No files provided" }, { status: 400 });
    }

    // If sessionId provided, verify it belongs to user
    if (sessionId) {
      const sessionExists = await prisma.session.findFirst({
        where: { id: sessionId, userId: session.user.id },
      });
      if (!sessionExists) {
        return NextResponse.json({ message: "Session not found" }, { status: 404 });
      }
    }

    const uploadedMaterials = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
      const fileName = `${fileHash}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const mimeType = file.type;

      let extractedText = "";

      if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "text/markdown") {
        extractedText = buffer.toString("utf-8");
      } else if (mimeType === "application/pdf") {
        extractedText = await extractTextFromPDF(buffer);
      } else if (mimeType.startsWith("image/")) {
        extractedText = await extractTextFromImage(buffer, mimeType);
      } else {
        extractedText = await extractTextFromDocument(buffer, mimeType);
      }

      const material = await prisma.material.create({
        data: {
          sessionId: sessionId || null,
          type: mimeType.startsWith("image/") ? "image" : mimeType === "application/pdf" ? "pdf" : "document",
          url: `/api/materials/${fileHash}/download`,
          mimeType,
          size: file.size,
          extractedText: extractedText.slice(0, 50000),
        },
      });

      uploadedMaterials.push({
        id: material.id,
        name: file.name,
        type: material.type,
        size: file.size,
        mimeType,
      });
    }

    return NextResponse.json({ materials: uploadedMaterials });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Upload failed" }, { status: 500 });
  }
}