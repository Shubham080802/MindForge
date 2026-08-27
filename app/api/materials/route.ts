import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";
import { env } from "@/lib/env";
import { assertAcceptedUpload, chunkText, extractText, privateObjectPath, sha256 } from "@/lib/materials";
import { embed } from "@/lib/agent/study-agent";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const subjectId = request.nextUrl.searchParams.get("subjectId");

    if (!subjectId || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
      throw new Response("Invalid subject identifier", { status: 400 });
    }

    const { data: materials, error } = await supabase
      .from("materials")
      .select("id, subject_id, original_name, mime_type, byte_size, processing_status, created_at")
      .eq("subject_id", subjectId)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ materials: materials ?? [] });
  } catch (error) {
    return responseFromError(error);
  }
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | undefined;
  let materialId: string | undefined;
  try {
    assertTrustedOrigin(request);
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "uploads");
    const body = await request.formData();
    const subjectId = body.get("subjectId");
    const file = body.get("file");
    if (typeof subjectId !== "string" || !/^[0-9a-f-]{36}$/i.test(subjectId) || !(file instanceof File)) {
      throw new Response("Invalid upload", { status: 400 });
    }
    assertAcceptedUpload(file, env.MAX_UPLOAD_BYTES);
    const bytes = Buffer.from(await file.arrayBuffer());
    materialId = crypto.randomUUID();
    uploadedPath = privateObjectPath(user.id, materialId);
    const { error: storageError } = await supabase.storage.from("study-materials").upload(uploadedPath, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (storageError) throw storageError;

    const { data: material, error: materialError } = await supabase.from("materials").insert({
      id: materialId,
      subject_id: subjectId,
      original_name: file.name,
      mime_type: file.type,
      object_path: uploadedPath,
      sha256: sha256(bytes),
      byte_size: file.size,
    }).select("id").single();
    if (materialError) throw materialError;

    const chunks = chunkText(await extractText(file, bytes));
    if (!chunks.length) throw new Response("No readable study content found", { status: 422 });
    const rows = await Promise.all(chunks.map(async (content, ordinal) => ({
      material_id: material.id,
      subject_id: subjectId,
      ordinal,
      content,
      embedding: await embed(content),
    })));
    const { error: chunkError } = await supabase.from("material_chunks").insert(rows);
    if (chunkError) throw chunkError;
    const { error: statusError } = await supabase.from("materials").update({ processing_status: "ready" }).eq("id", material.id);
    if (statusError) throw statusError;
    await supabase.from("audit_events").insert({ event_type: "material_processed", metadata: { material_id: material.id, chunk_count: rows.length } });
    return NextResponse.json({ materialId: material.id, chunkCount: rows.length }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      try {
        const { supabase } = await requireUser();
        if (materialId) await supabase.from("materials").delete().eq("id", materialId);
        await supabase.storage.from("study-materials").remove([uploadedPath]);
      } catch { /* Avoid leaking cleanup details. */ }
    }
    return responseFromError(error);
  }
}
