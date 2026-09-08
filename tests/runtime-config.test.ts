import { describe, expect, it } from "vitest";
import { runtimeReadiness } from "@/lib/runtime-config";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db.example.com:5432/mindforge",
  DIRECT_URL: "postgresql://user:pass@db.example.com:5432/mindforge",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_configured",
  CLERK_SECRET_KEY: "sk_live_configured",
  GEMINI_API_KEY: "configured-at-runtime",
  UPSTASH_REDIS_REST_URL: "https://redis.example.com",
  UPSTASH_REDIS_REST_TOKEN: "configured-at-runtime",
  RATE_LIMIT_HASH_SECRET: "a-secure-production-secret-with-32-chars",
  TRUSTED_PROXY_HEADER: "x-forwarded-for",
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.com",
  CRON_SECRET: "configured-at-runtime",
};

describe("runtime readiness", () => {
  it("accepts a complete production environment", () => {
    expect(runtimeReadiness(productionEnv).ready).toBe(true);
  });

  it("reports unsafe or incomplete production configuration", () => {
    const result = runtimeReadiness({
      ...productionEnv,
      CLERK_SECRET_KEY: "invalid",
      GEMINI_API_KEY: "",
      RATE_LIMIT_HASH_SECRET: "short",
      CRON_SECRET: "",
      TRUSTED_PROXY_HEADER: "client-ip",
    });
    expect(result.ready).toBe(false);
    expect(result.issues).toContain("CLERK_SECRET_KEY must be a Clerk secret key");
    expect(result.issues).toContain("GEMINI_API_KEY is required");
    expect(result.issues).toContain("RATE_LIMIT_HASH_SECRET must be at least 32 characters");
    expect(result.issues).toContain("CRON_SECRET is required");
    expect(result.issues).toContain("TRUSTED_PROXY_HEADER must name a supported proxy-controlled header");
  });

  it("rejects malformed Clerk publishable keys", () => {
    const result = runtimeReadiness({ ...productionEnv, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "invalid" });
    expect(result.issues).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key");
  });
});
