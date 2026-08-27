import { NextRequest, NextResponse } from "next/server";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ materialId: string }> }
) {
  try {
    assertTrustedOrigin(request);
    const { materialId } = await context.params;
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "material-delete");

    if (!materialId || !/^[0-9a-f-]{36}$/i.test(materialId)) {
      throw new Response("Invalid material identifier", { status: 400 });
    }

    const { data: material, error: fetchError } = await supabase
      .from("materials")
      .select("id, object_path")
      .eq("id", materialId)
      .eq("owner_id", user.id)
      .single();

    if (fetchError || !material) {
      throw new Response("Material not found", { status: 404 });
    }

    if (material.object_path) {
      await supabase.storage.from("study-materials").remove([material.object_path]);
    }

    const { error: deleteError } = await supabase
      .from("materials")
      .delete()
      .eq("id", materialId)
      .eq("owner_id", user.id);

    if (deleteError) throw deleteError;

    await supabase.from("audit_events").insert({
      event_type: "material_deleted",
      metadata: { material_id: materialId },
    });

    return NextResponse.json({ success: true, deletedMaterialId: materialId });
  } catch (error) {
    return responseFromError(error);
  }
}
