type RuntimeEnvironment = Record<string, string | undefined>;

export const TRUSTED_PROXY_HEADERS = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"] as const;

export function isTrustedProxyHeader(value: string | undefined) {
  return Boolean(value && TRUSTED_PROXY_HEADERS.includes(value.toLowerCase() as (typeof TRUSTED_PROXY_HEADERS)[number]));
}

const REQUIRED_PRODUCTION_VALUES = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "OPENAI_API_KEY",
  "EMAIL_SERVER_HOST",
  "EMAIL_SERVER_PORT",
  "EMAIL_SERVER_USER",
  "EMAIL_SERVER_PASSWORD",
  "EMAIL_FROM",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
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
    if (env.NEXTAUTH_URL && !env.NEXTAUTH_URL.startsWith("https://")) {
      issues.push("NEXTAUTH_URL must use HTTPS in production");
    }
    if (env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length < 32) {
      issues.push("NEXTAUTH_SECRET must be at least 32 characters");
    }
    if (env.TRUSTED_PROXY_HEADER && !isTrustedProxyHeader(env.TRUSTED_PROXY_HEADER)) {
      issues.push("TRUSTED_PROXY_HEADER must name a supported proxy-controlled header");
    }
  }

  for (const provider of ["GOOGLE", "GITHUB"] as const) {
    const hasId = Boolean(env[`${provider}_CLIENT_ID`]?.trim());
    const hasSecret = Boolean(env[`${provider}_CLIENT_SECRET`]?.trim());
    if (hasId !== hasSecret) issues.push(`${provider} OAuth requires both client ID and secret`);
  }

  const retentionDays = Number(env.AUDIT_RETENTION_DAYS ?? "365");
  if (!Number.isInteger(retentionDays) || retentionDays < 30) {
    issues.push("AUDIT_RETENTION_DAYS must be an integer of at least 30");
  }

  return { ready: issues.length === 0, issues };
}
