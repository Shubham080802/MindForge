import crypto from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const POLICIES = {
  "auth-request": { requests: 5, window: "15 m", windowMs: 15 * 60_000 },
  "auth-attempt": { requests: 10, window: "15 m", windowMs: 15 * 60_000 },
  upload: { requests: 20, window: "1 h", windowMs: 60 * 60_000 },
  ai: { requests: 30, window: "1 m", windowMs: 60_000 },
  export: { requests: 20, window: "1 h", windowMs: 60 * 60_000 },
} as const;

export type RateLimitPolicy = keyof typeof POLICIES;
type Decision = { success: boolean; reset: number };

export interface RateLimitAdapter {
  check(key: string, policy: RateLimitPolicy): Promise<Decision>;
}

export type RateLimitIdentity = {
  ip: string;
  subject?: string;
};

export function createRateLimitGate(adapter: RateLimitAdapter) {
  return async (identity: RateLimitIdentity, policy: RateLimitPolicy) => {
    const dimensions = [
      `ip:${identity.ip}`,
      ...(identity.subject ? [`subject:${identity.subject}`] : []),
    ];
    const results = await Promise.all(dimensions.map((key) => adapter.check(key, policy)));
    const rejected = results.filter((result) => !result.success);
    if (rejected.length) {
      const reset = Math.max(...rejected.map((result) => result.reset));
      throw new Response("Too many requests", {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) },
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
    const cacheKey = `${policy}:${key}`;
    const now = Date.now();
    const current = this.entries.get(cacheKey);
    const entry = !current || current.reset <= now ? { count: 0, reset: now + config.windowMs } : current;
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

const TRUSTED_PROXY_HEADERS = new Set(["x-forwarded-for", "x-real-ip", "cf-connecting-ip"]);

type RateLimitHeaders = Pick<Headers, "get"> | Record<string, unknown>;

function headerValue(headers: RateLimitHeaders | undefined, name: string) {
  if (!headers) return undefined;
  if ("get" in headers && typeof headers.get === "function") return headers.get(name) ?? undefined;
  const value = (headers as Record<string, unknown>)[name];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function configuredClientAddress(request: { headers?: RateLimitHeaders }) {
  const configured = process.env.TRUSTED_PROXY_HEADER?.toLowerCase();
  if (process.env.NODE_ENV === "production" && (!configured || !TRUSTED_PROXY_HEADERS.has(configured))) {
    throw new Response("Trusted proxy configuration is invalid", { status: 503 });
  }
  const header = configured && TRUSTED_PROXY_HEADERS.has(configured) ? configured : "x-forwarded-for";
  const value = headerValue(request.headers, header)?.split(",")[0]?.trim();
  return value || "unknown";
}

function hashIdentity(kind: "ip" | "subject", value: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Response("Server authentication is not configured", { status: 503 });
  return crypto.createHmac("sha256", secret).update(`${kind}:${value.toLowerCase()}`).digest("hex");
}

export async function enforceRateLimit(
  request: { headers?: RateLimitHeaders },
  policy: RateLimitPolicy,
  subject?: string,
) {
  const address = configuredClientAddress(request);
  await productionGate()({
    ip: hashIdentity("ip", address),
    subject: subject ? hashIdentity("subject", subject) : undefined,
  }, policy);
}
