import { NextRequest, NextResponse } from "next/server";
import { assertTrustedOrigin, requireRateLimit, requireUser, responseFromError } from "@/lib/security";
import { subjectInput } from "@/lib/validation";

export async function GET() {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.from("subjects").select("id,name,description,created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ subjects: data });
  } catch (error) {
    return responseFromError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const { supabase, user } = await requireUser();
    await requireRateLimit(user.id, "subjects");
    const input = subjectInput.parse(await request.json());
    const { data, error } = await supabase.from("subjects").insert(input).select("id,name,description,created_at").single();
    if (error) throw error;
    await supabase.from("audit_events").insert({ event_type: "subject_created", metadata: { subject_id: data.id } });
    return NextResponse.json({ subject: data }, { status: 201 });
  } catch (error) {
    return responseFromError(error);
  }
}
