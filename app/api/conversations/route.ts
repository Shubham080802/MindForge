import { NextRequest, NextResponse } from "next/server";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";
import { conversationInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const subjectId = request.nextUrl.searchParams.get("subjectId");

    if (!subjectId || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
      throw new Response("Invalid subject identifier", { status: 400 });
    }

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, subject_id, created_at")
      .eq("subject_id", subjectId)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError) throw convError;

    if (!conversation) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;

    return NextResponse.json({
      conversation,
      messages: messages ?? [],
    });
  } catch (error) {
    return responseFromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "conversations");
    const input = conversationInput.parse(await request.json());
    const { data, error } = await supabase
      .from("conversations")
      .insert({ subject_id: input.subjectId })
      .select("id,subject_id,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (error) {
    return responseFromError(error);
  }
}
