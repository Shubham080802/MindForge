type RuntimeEnvironment = Record<string, string | undefined>;

export const TRUSTED_PROXY_HEADERS = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"] as const;

export function isTrustedProxyHeader(value: string | undefined) {
  return Boolean(value && TRUSTED_PROXY_HEADERS.includes(value.toLowerCase() as (typeof TRUSTED_PROXY_HEADERS)[number]));
}

const REQUIRED_PRODUCTION_VALUES = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "OPENAI_API_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RATE_LIMIT_HASH_SECRET",
  "TRUSTED_PROXY_HEADER",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "CRON_SECRET",
] as const;

export function runtimeReadiness(env: RuntimeEnvironment, production = env.NODE_ENV === "production") {
  const issues: string[] = [];
  if (production) {
    for (const name of REQUIRED_PRODUCTION_VALUES) {
      if (!env[name]?.trim()) issues.push(`${name} is required`);
    }
    if (env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_")) {
      issues.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key");
    }
    if (env.CLERK_SECRET_KEY && !env.CLERK_SECRET_KEY.startsWith("sk_")) {
      issues.push("CLERK_SECRET_KEY must be a Clerk secret key");
    }
    if (env.RATE_LIMIT_HASH_SECRET && env.RATE_LIMIT_HASH_SECRET.length < 32) {
      issues.push("RATE_LIMIT_HASH_SECRET must be at least 32 characters");
    }
    if (env.TRUSTED_PROXY_HEADER && !isTrustedProxyHeader(env.TRUSTED_PROXY_HEADER)) {
      issues.push("TRUSTED_PROXY_HEADER must name a supported proxy-controlled header");
    }
  }

  const retentionDays = Number(env.AUDIT_RETENTION_DAYS ?? "365");
  if (!Number.isInteger(retentionDays) || retentionDays < 30) {
    issues.push("AUDIT_RETENTION_DAYS must be an integer of at least 30");
  }

  return { ready: issues.length === 0, issues };
}
