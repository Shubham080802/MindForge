import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError, requireMutation } from "@/lib/request-guard";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    const { materialId } = await params;

    const deleted = await prisma.material.deleteMany({ where: { id: materialId, userId: auth.userId } });
    if (!deleted.count) return NextResponse.json({ message: "Material not found" }, { status: 404 });

    await recordAudit({ action: "material.deleted", userId: auth.userId, targetType: "material", targetId: materialId });
    return NextResponse.json({ success: true, deletedMaterialId: materialId });
  } catch (error) {
    return internalError("Delete material", error);
  }
}
