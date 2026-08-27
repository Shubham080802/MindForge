import { NextRequest, NextResponse } from "next/server";
import { embed, evaluateAnswer } from "@/lib/agent/study-agent";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";
import { z } from "zod";

const evaluationSchema = z.object({
  subjectId: z.string().uuid(),
  question: z.string().min(1).max(4000),
  answer: z.string().min(1).max(8000),
});

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "evaluate-answer");

    const input = evaluationSchema.parse(await request.json());

    const queryEmbedding = await embed(input.question);
    const { data: chunks, error: matchError } = await supabase.rpc("match_material_chunks", {
      p_subject_id: input.subjectId,
      p_embedding: queryEmbedding,
      p_match_count: 6,
    });

    if (matchError) throw matchError;

    const evaluation = await evaluateAnswer(input.question, input.answer, chunks ?? []);

    await supabase.from("audit_events").insert({
      event_type: "answer_evaluated",
      metadata: { subject_id: input.subjectId, score: evaluation.score },
    });

    return NextResponse.json({ evaluation });
  } catch (error) {
    return responseFromError(error);
  }
}
