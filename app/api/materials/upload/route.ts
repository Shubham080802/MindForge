import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

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

      if (mimeType.startsWith("text/") || mimeType === "application/json") {
        extractedText = buffer.toString("utf-8");
      } else if (mimeType === "application/pdf") {
        try {
          const pdfParse = await import("pdf-parse");
          const data = await pdfParse.default(buffer);
          extractedText = data.text;
        } catch {
          extractedText = "[PDF text extraction failed]";
        }
      } else if (mimeType.startsWith("image/")) {
        extractedText = `[Image: ${file.name}] - OCR not yet implemented`;
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