import { NextRequest, NextResponse } from "next/server";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ subjectId: string }> }
) {
  try {
    assertTrustedOrigin(request);
    const { subjectId } = await context.params;
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "subject-delete");

    if (!subjectId || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
      throw new Response("Invalid subject identifier", { status: 400 });
    }

    // Fetch storage object paths before deleting database records
    const { data: materials } = await supabase
      .from("materials")
      .select("object_path")
      .eq("subject_id", subjectId);

    if (materials && materials.length > 0) {
      const paths = materials.map((m) => m.object_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("study-materials").remove(paths);
      }
    }

    // Delete subject from database (cascades to materials, material_chunks, conversations, messages, study_questions)
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", subjectId)
      .eq("owner_id", user.id);

    if (error) throw error;

    await supabase.from("audit_events").insert({
      event_type: "subject_deleted",
      metadata: { subject_id: subjectId },
    });

    return NextResponse.json({ success: true, deletedSubjectId: subjectId });
  } catch (error) {
    return responseFromError(error);
  }
}
