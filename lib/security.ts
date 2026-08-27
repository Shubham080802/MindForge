import { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const rateLimiters = new Map<string, Ratelimit>();

function limiter(action: string) {
  const cached = rateLimiters.get(action);
  if (cached) return cached;
  const value = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(env.RATE_LIMIT_REQUESTS, `${env.RATE_LIMIT_WINDOW_SECONDS} s`),
    prefix: `study-agent:${action}`,
    analytics: false,
  });
  rateLimiters.set(action, value);
  return value;
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Response("Authentication required", { status: 401 });
  return { supabase, user };
}

export async function requireRateLimit(userId: string, action: string) {
  const result = await limiter(action).limit(userId);
  if (!result.success) {
    throw new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) },
    });
  }
}

export function assertTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== env.APP_ORIGIN) throw new Response("Invalid request origin", { status: 403 });
}

export function safeNextPath(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function responseFromError(error: unknown) {
  if (error instanceof Response) return error;
  console.error("Request failed", error instanceof Error ? error.name : "unknown-error");
  return new Response("Request could not be completed", { status: 500 });
}
