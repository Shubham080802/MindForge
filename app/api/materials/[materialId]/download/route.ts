import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/request-guard";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ materialId: string }> }) {
  try {
    const auth = await requireAppUser();
    if ("error" in auth) return auth.error;
    const { materialId } = await context.params;
    const material = await prisma.material.findFirst({
      where: { id: materialId, userId: auth.userId },
      select: { fileName: true, mimeType: true, fileContent: true },
    });
    if (!material?.fileContent) return NextResponse.json({ message: "Material not found" }, { status: 404 });
    return new NextResponse(new Uint8Array(material.fileContent), {
      headers: {
        "Content-Type": material.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(material.fileName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Material download failed", error);
    return NextResponse.json({ message: "Material could not be downloaded" }, { status: 500 });
  }
}
