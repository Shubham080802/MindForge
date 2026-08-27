import { NextRequest, NextResponse } from "next/server";
import { answerStudyQuestion, embed } from "@/lib/agent/study-agent";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";
import { messageInput } from "@/lib/validation";

export async function POST(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  try {
    assertTrustedOrigin(request);
    const { conversationId } = await context.params;
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "tutor-messages");
    const input = messageInput.parse(await request.json());
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id,subject_id")
      .eq("id", conversationId)
      .single();
    if (conversationError || !conversation) throw new Response("Conversation not found", { status: 404 });

    const { error: userMessageError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "user",
      content: input.prompt,
    });
    if (userMessageError) throw userMessageError;

    const queryEmbedding = await embed(input.prompt);
    const { data: chunks, error: retrievalError } = await supabase.rpc("match_material_chunks", {
      p_subject_id: conversation.subject_id,
      p_embedding: queryEmbedding,
      p_match_count: 8,
    });
    if (retrievalError) throw retrievalError;
    const answer = await answerStudyQuestion(input.prompt, chunks ?? []);
    const { data: assistantMessage, error: assistantMessageError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: answer,
    }).select("id,content,created_at").single();
    if (assistantMessageError) throw assistantMessageError;
    await supabase.from("audit_events").insert({
      event_type: "tutor_answer_created",
      metadata: { conversation_id: conversation.id, retrieved_chunks: chunks?.length ?? 0 },
    });
    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    return responseFromError(error);
  }
}
