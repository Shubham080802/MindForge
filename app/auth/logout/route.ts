import { NextRequest, NextResponse } from "next/server";
import { assertTrustedOrigin } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/", request.url), 303);
  } catch (error) {
    return error instanceof Response ? error : new Response("Logout failed", { status: 500 });
  }
}
