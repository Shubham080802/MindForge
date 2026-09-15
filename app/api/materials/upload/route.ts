import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, requireMutation } from "@/lib/request-guard";
import { prepareMaterialBatch, validateMaterialBatch } from "@/lib/material-ingestion";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import { assessMaterialScope, materialScopeMessage } from "@/lib/study-scope-server";

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

    // The learner's stated purpose is what distinguishes a case study about a
    // hotel chain from a hotel booking, so it travels with the review.
    const purpose = formData.get("purpose");
    const verdicts = await assessMaterialScope(
      preparedMaterials.map((material) => ({ fileName: material.fileName, text: material.extractedText ?? "" })),
      { purpose: typeof purpose === "string" ? purpose : undefined },
    );
    const declined = verdicts.filter((verdict) => !verdict.allowed);
    if (declined.length) {
      await recordAudit({
        action: "material.scope_declined",
        userId: auth.userId,
        targetType: "material_batch",
        // Counts only: file names and reasons can reveal what a learner studies.
        metadata: { declined: declined.length, submitted: verdicts.length },
      });
      return NextResponse.json(
        { message: materialScopeMessage(declined), code: "MATERIAL_SCOPE_REQUIRED" },
        { status: 422 },
      );
    }

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
      metadata: {
        count: uploadedMaterials.length,
        materialIds: uploadedMaterials.map((material) => material.id),
        review: verdicts.map((verdict) => verdict.method),
      },
    });
    return NextResponse.json({ materials: uploadedMaterials }, { status: 201 });
  } catch (error) {
    return internalError("Material upload", error);
  }
}
