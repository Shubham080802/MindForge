import crypto from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

const POLICIES = {
  "auth-request": { requests: 5, window: "15 m" },
  "auth-attempt": { requests: 10, window: "15 m" },
  upload: { requests: 20, window: "1 h" },
  ai: { requests: 30, window: "1 m" },
  export: { requests: 20, window: "1 h" },
} as const;

export type RateLimitPolicy = keyof typeof POLICIES;
type Decision = { success: boolean; reset: number };

export interface RateLimitAdapter {
  check(key: string, policy: RateLimitPolicy): Promise<Decision>;
}

export function createRateLimitGate(adapter: RateLimitAdapter) {
  return async (key: string, policy: RateLimitPolicy) => {
    const result = await adapter.check(key, policy);
    if (!result.success) {
      throw new Response("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) },
      });
    }
  };
}

class UpstashRateLimitAdapter implements RateLimitAdapter {
  private readonly limiters = new Map<RateLimitPolicy, Ratelimit>();

  constructor(private readonly redis: Redis) {}

  async check(key: string, policy: RateLimitPolicy) {
    let limiter = this.limiters.get(policy);
    if (!limiter) {
      const config = POLICIES[policy];
      limiter = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `mindforge:${policy}`,
        analytics: false,
      });
      this.limiters.set(policy, limiter);
    }
    return limiter.limit(key);
  }
}

class DevelopmentRateLimitAdapter implements RateLimitAdapter {
  private readonly entries = new Map<string, { count: number; reset: number }>();

  async check(key: string, policy: RateLimitPolicy) {
    const config = POLICIES[policy];
    const windowMs = config.window === "1 m" ? 60_000 : config.window === "15 m" ? 900_000 : 3_600_000;
    const cacheKey = `${policy}:${key}`;
    const now = Date.now();
    const current = this.entries.get(cacheKey);
    const entry = !current || current.reset <= now ? { count: 0, reset: now + windowMs } : current;
    entry.count += 1;
    this.entries.set(cacheKey, entry);
    return { success: entry.count <= config.requests, reset: entry.reset };
  }
}

let gate: ReturnType<typeof createRateLimitGate> | undefined;

function productionGate() {
  if (gate) return gate;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    gate = createRateLimitGate(new UpstashRateLimitAdapter(new Redis({ url, token })));
  } else if (process.env.NODE_ENV === "production") {
    throw new Response("Abuse protection is not configured", { status: 503 });
  } else {
    gate = createRateLimitGate(new DevelopmentRateLimitAdapter());
  }
  return gate;
}

function requestIdentity(request: NextRequest, subject: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Response("Server authentication is not configured", { status: 503 });
  return crypto.createHmac("sha256", secret).update(`${address}:${subject.toLowerCase()}`).digest("hex");
}

export async function enforceRateLimit(request: NextRequest, policy: RateLimitPolicy, subject = "anonymous") {
  await productionGate()(requestIdentity(request, subject), policy);
}
