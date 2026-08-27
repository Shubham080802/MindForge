import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: env.SUPABASE_OAUTH_PROVIDER as never,
    options: { redirectTo: `${env.APP_ORIGIN}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return new Response("Login could not be started", { status: 500 });
  return NextResponse.redirect(data.url);
}
