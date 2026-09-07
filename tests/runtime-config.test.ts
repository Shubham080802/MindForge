import { describe, expect, it } from "vitest";
import { runtimeReadiness } from "@/lib/runtime-config";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db.example.com:5432/mindforge",
  NEXTAUTH_URL: "https://mindforge.example.com",
  NEXTAUTH_SECRET: "a-secure-production-secret-with-32-chars",
  OPENAI_API_KEY: "configured-at-runtime",
  EMAIL_SERVER_HOST: "smtp.example.com",
  EMAIL_SERVER_PORT: "587",
  EMAIL_SERVER_USER: "mailer",
  EMAIL_SERVER_PASSWORD: "configured-at-runtime",
  EMAIL_FROM: "MindForge <hello@example.com>",
  UPSTASH_REDIS_REST_URL: "https://redis.example.com",
  UPSTASH_REDIS_REST_TOKEN: "configured-at-runtime",
  NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.com",
  CRON_SECRET: "configured-at-runtime",
};

describe("runtime readiness", () => {
  it("accepts a complete production environment", () => {
    expect(runtimeReadiness(productionEnv).ready).toBe(true);
  });

  it("reports unsafe or incomplete production configuration", () => {
    const result = runtimeReadiness({ ...productionEnv, NEXTAUTH_URL: "http://example.com", CRON_SECRET: "" });
    expect(result.ready).toBe(false);
    expect(result.issues).toContain("NEXTAUTH_URL must use HTTPS in production");
    expect(result.issues).toContain("CRON_SECRET is required");
  });

  it("rejects half-configured OAuth providers", () => {
    const result = runtimeReadiness({ ...productionEnv, GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "" });
    expect(result.issues).toContain("GOOGLE OAuth requires both client ID and secret");
  });
});
