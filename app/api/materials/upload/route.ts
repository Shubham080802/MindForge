import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, requireMutation } from "@/lib/request-guard";
import { prepareMaterialBatch, validateMaterialBatch } from "@/lib/material-ingestion";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    await enforceRateLimit(request, "upload", auth.userId);

    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    const sessionId = formData.get("sessionId");
    validateMaterialBatch(files);
    if (typeof sessionId === "string" && !(await prisma.session.findFirst({ where: { id: sessionId, userId: auth.userId }, select: { id: true } }))) {
      return NextResponse.json({ message: "Study session not found" }, { status: 404 });
    }

    const preparedMaterials = await prepareMaterialBatch(files, auth.userId, typeof sessionId === "string" ? sessionId : null);

    const uploadedMaterials = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const data of preparedMaterials) {
        const material = await tx.material.create({ data });
        const url = `/api/materials/${material.id}/download`;
        await tx.material.update({ where: { id: material.id }, data: { url } });
        results.push({ id: material.id, name: material.fileName, type: material.type, size: material.size, mimeType: material.mimeType, url });
      }
      return results;
    });
    await recordAudit({
      action: "material.uploaded",
      userId: auth.userId,
      targetType: "material_batch",
      metadata: { count: uploadedMaterials.length, materialIds: uploadedMaterials.map((material) => material.id) },
    });
    return NextResponse.json({ materials: uploadedMaterials }, { status: 201 });
  } catch (error) {
    return internalError("Material upload", error);
  }
}
