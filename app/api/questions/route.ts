import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/agent/study-agent";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";
import { questionInput } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "questions");
    const input = questionInput.parse(await request.json());
    const { data: chunks, error } = await supabase
      .from("material_chunks")
      .select("id,content")
      .eq("subject_id", input.subjectId)
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    if (!chunks?.length) throw new Response("Add study material before generating questions", { status: 422 });
    const questions = await generateQuestions(chunks.map((chunk) => ({ ...chunk, source_name: "material", similarity: 1 })), input.count);
    const { data, error: insertError } = await supabase.from("study_questions").insert(
      questions.map((question) => ({ subject_id: input.subjectId, question })),
    ).select("id,question,created_at");
    if (insertError) throw insertError;
    await supabase.from("audit_events").insert({ event_type: "questions_generated", metadata: { subject_id: input.subjectId, count: data.length } });
    return NextResponse.json({ questions: data });
  } catch (error) {
    return responseFromError(error);
  }
}
