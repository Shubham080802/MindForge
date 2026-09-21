import { NextRequest, NextResponse } from "next/server";
import { internalError, parseJson, requireMutation } from "@/lib/request-guard";
import { practiceAnswerInput } from "@/lib/validation";
import { recordPracticeResponse } from "@/lib/learning-record";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; roundId: string }> },
) {
  try {
    const auth = await requireMutation(request);
    if ("error" in auth) return auth.error;
    const { sessionId, roundId } = await params;
    const { questionId, answer } = await parseJson(request, practiceAnswerInput);
    const result = await recordPracticeResponse({
      userId: auth.userId,
      sessionId,
      roundId,
      questionId,
      answer,
    });
    if (!result) return NextResponse.json({ message: "Practice question not found" }, { status: 404 });

    await recordAudit({
      action: "practice.answered",
      userId: auth.userId,
      targetType: "practice_round",
      targetId: roundId,
      metadata: { questionId, verdict: result.evaluation.verdict },
    });
    return NextResponse.json(result);
  } catch (error) {
    return internalError("Answer practice question", error);
  }
}
